"""
StudyBuddyAI Data Pipeline
======================
Handles all data operations between the Python agent and the Next.js API:
  - Conversation lifecycle (create → update → complete)
  - Live transcript accumulation
  - Background data extraction (12+ student data points)
  - Post-call lead scoring (Intent 40% + Financial 30% + Timeline 30%)
  - Sentiment analysis (Excited / Anxious / Confused / Neutral)
  - WhatsApp summary dispatch (Twilio)

All communication goes through the Next.js API routes which handle Supabase
writes using the SERVICE_ROLE_KEY, so this module only needs the API base URL.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from openai import AsyncOpenAI
from twilio_client import send_whatsapp_summary

logger = logging.getLogger("studybuddyai-pipeline")

# ── Config ──
API_BASE_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
_openai_client: Optional[AsyncOpenAI] = None


def _get_openai() -> AsyncOpenAI:
    """Lazy-init singleton OpenAI client."""
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI()
    return _openai_client


# ============================================================
# Conversation Lifecycle
# ============================================================


async def create_conversation(room_name: str) -> Optional[str]:
    """
    Register a new conversation in Supabase via the Next.js API.
    Returns the conversation ID or None on failure.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{API_BASE_URL}/api/conversations",
                json={"room_name": room_name},
            )
            resp.raise_for_status()
            data = resp.json()
            convo_id = data.get("conversation", {}).get("id")
            logger.info(f"Created conversation: {convo_id}")
            return convo_id
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        return None


async def update_conversation(
    conversation_id: str,
    *,
    transcript: Optional[list] = None,
    extracted_data: Optional[dict] = None,
    sentiment_log: Optional[list] = None,
    status: Optional[str] = None,
    ended_at: Optional[str] = None,
    duration_secs: Optional[int] = None,
    language: Optional[str] = None,
) -> bool:
    """
    PATCH the conversation with updated fields.
    Only sends non-None fields to avoid overwriting data.
    """
    payload: dict = {}
    if transcript is not None:
        payload["transcript"] = transcript
    if extracted_data is not None:
        payload["extracted_data"] = extracted_data
    if sentiment_log is not None:
        payload["sentiment_log"] = sentiment_log
    if status is not None:
        payload["status"] = status
    if ended_at is not None:
        payload["ended_at"] = ended_at
    if duration_secs is not None:
        payload["duration_secs"] = duration_secs
    if language is not None:
        payload["language"] = language

    if not payload:
        return True

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(
                f"{API_BASE_URL}/api/conversations/{conversation_id}",
                json=payload,
            )
            resp.raise_for_status()
            logger.info(
                f"Updated conversation {conversation_id}: {list(payload.keys())}"
            )
            return True
    except Exception as e:
        logger.error(f"Failed to update conversation {conversation_id}: {e}")
        return False


async def create_lead_score(
    conversation_id: str,
    intent_score: int,
    financial_score: int,
    timeline_score: int,
    recommended_actions: list[str],
    notes: str = "",
) -> bool:
    """Submit the lead score to the Next.js API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{API_BASE_URL}/api/leads",
                json={
                    "conversation_id": conversation_id,
                    "intent_score": intent_score,
                    "financial_score": financial_score,
                    "timeline_score": timeline_score,
                    "recommended_actions": recommended_actions,
                    "notes": notes,
                },
            )
            resp.raise_for_status()
            logger.info(f"Lead score created for conversation {conversation_id}")
            return True
    except Exception as e:
        logger.error(f"Failed to create lead score: {e}")
        return False


async def create_student_profile(extracted_data: dict) -> Optional[str]:
    """Create a student profile from extracted data. Returns profile ID."""
    if (
        not extracted_data.get("name")
        and not extracted_data.get("email")
        and not extracted_data.get("phone")
    ):
        logger.info("Skipping student profile creation — no identifier available")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{API_BASE_URL}/api/students",
                json=extracted_data,
            )
            resp.raise_for_status()
            data = resp.json()
            profile_id = data.get("profile", {}).get("id")
            logger.info(f"Created student profile: {profile_id}")
            return profile_id
    except Exception as e:
        logger.error(f"Failed to create student profile: {e}")
        return None


# ============================================================
# LLM-Powered Extraction & Scoring
# ============================================================

_EXTRACTION_SYSTEM_PROMPT = """You are a data extraction engine for an overseas education consultancy.
Given a conversation transcript between a student and an AI counsellor, extract all available student data points.

Return a JSON object with ONLY these keys (use null for missing data):
{
  "name": "Student's full name",
  "phone": "Phone number",
  "email": "Email address",
  "location": "City or state",
  "education_level": "12th / UG / PG / PhD",
  "field_of_study": "e.g. Computer Science, Business",
  "institution": "Current school/college name",
  "gpa": "GPA or percentage",
  "target_countries": ["UK", "Ireland"],
  "course_interest": "Specific course they want to study",
  "preferred_intake": "September / January / etc",
  "test_type": "IELTS / PTE / TOEFL",
  "test_score": "Score if mentioned",
  "budget_range": "Budget for tuition + living",
  "scholarship_interest": true/false,
  "timeline": "When they plan to apply"
}

RULES:
- Extract ONLY what was explicitly stated. Do NOT infer or assume.
- If a field was not mentioned at all, set it to null.
- For target_countries, return an array.
- For scholarship_interest, return true if they mentioned interest, false if they said no, null if not discussed.
- Return ONLY valid JSON, no markdown, no explanation."""


async def extract_student_data(transcript: list[dict]) -> dict:
    """
    Feed the transcript to gpt-4o-mini to extract structured student data.
    Uses a cheap, fast model to avoid latency on the main conversation.
    """
    if not transcript:
        return {}

    # Format transcript for the LLM
    formatted = "\n".join(
        f"{'Student' if t['role'] == 'user' else 'Counsellor'}: {t['text']}"
        for t in transcript
    )

    try:
        client = _get_openai()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Transcript:\n\n{formatted}"},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=800,
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)

        # Clean up nulls and empty values
        cleaned = {
            k: v for k, v in data.items() if v is not None and v != "" and v != []
        }
        logger.info(f"Extracted {len(cleaned)} data points: {list(cleaned.keys())}")
        return cleaned

    except Exception as e:
        logger.error(f"Data extraction failed: {e}")
        return {}


_SCORING_SYSTEM_PROMPT = """You are a lead qualification engine for an overseas education consultancy.
Given a student conversation transcript and their extracted profile data, evaluate them on three dimensions.

Score each dimension from 0 to 100:

1. INTENT SERIOUSNESS (Weight: 40%)
   High (70-100): Clear goals, specific university/course preferences, has done research
   Medium (40-69): General interest, exploring options, some clarity on field
   Low (0-39): Vague interest, just browsing, no specific plans

2. FINANCIAL READINESS (Weight: 30%)
   High (70-100): Clear budget, aware of costs, has funding plan or loan approval
   Medium (40-69): General awareness of costs, discussing scholarship options
   Low (0-39): No budget discussion, unaware of costs, no financial plan

3. TIMELINE URGENCY (Weight: 30%)
   High (70-100): Applying this cycle, has test scores ready, specific intake in mind
   Medium (40-69): Planning for next year, preparing for tests
   Low (0-39): No timeline, vague "someday" plans, just starting to explore

Return a JSON object:
{
  "intent_score": <0-100>,
  "financial_score": <0-100>,
  "timeline_score": <0-100>,
  "recommended_actions": ["Action 1", "Action 2", "Action 3"],
  "sentiment_summary": "One sentence describing the student's overall emotional state during the call",
  "notes": "Brief summary of the student's situation and readiness"
}

RULES:
- Be objective and fair. Base scores ONLY on what was discussed.
- recommended_actions should be specific, actionable items for the human counsellor.
- Return ONLY valid JSON, no markdown, no explanation."""


async def evaluate_lead_score(transcript: list[dict], extracted_data: dict) -> dict:
    """
    Post-call evaluation: assign Intent, Financial, and Timeline scores.
    Returns the full scoring result dict.
    """
    if not transcript:
        return {
            "intent_score": 0,
            "financial_score": 0,
            "timeline_score": 0,
            "recommended_actions": ["No conversation data available"],
            "sentiment_summary": "No data",
            "notes": "Empty transcript",
        }

    formatted_transcript = "\n".join(
        f"{'Student' if t['role'] == 'user' else 'Counsellor'}: {t['text']}"
        for t in transcript
    )

    profile_summary = (
        json.dumps(extracted_data, indent=2)
        if extracted_data
        else "No profile data extracted"
    )

    try:
        client = _get_openai()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SCORING_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"TRANSCRIPT:\n{formatted_transcript}\n\n"
                        f"EXTRACTED PROFILE:\n{profile_summary}"
                    ),
                },
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=600,
        )

        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        # Ensure all required fields exist with sane defaults
        result.setdefault("intent_score", 0)
        result.setdefault("financial_score", 0)
        result.setdefault("timeline_score", 0)
        result.setdefault("recommended_actions", [])
        result.setdefault("sentiment_summary", "")
        result.setdefault("notes", "")

        # Clamp scores to 0-100
        for key in ("intent_score", "financial_score", "timeline_score"):
            result[key] = max(0, min(100, int(result[key])))

        logger.info(
            f"Lead evaluation complete: Intent={result['intent_score']}, "
            f"Financial={result['financial_score']}, Timeline={result['timeline_score']}"
        )
        return result

    except Exception as e:
        logger.error(f"Lead evaluation failed: {e}")
        return {
            "intent_score": 0,
            "financial_score": 0,
            "timeline_score": 0,
            "recommended_actions": ["Evaluation failed — manual review required"],
            "sentiment_summary": "Error during evaluation",
            "notes": str(e),
        }


_SENTIMENT_SYSTEM_PROMPT = """You are a sentiment analysis engine.
Given a conversation transcript between a student and an AI counsellor, analyze the student's emotional progression.

For each student turn, classify their sentiment as one of:
- "excited" — enthusiastic, positive, eager
- "positive" — generally happy, cooperative, engaged
- "neutral" — matter-of-fact, informational
- "confused" — unsure, asking for clarification, lost
- "negative" — frustrated, disappointed, upset

Return a JSON object:
{
  "entries": [
    {"turn": 1, "sentiment": "neutral", "confidence": 0.8},
    {"turn": 2, "sentiment": "excited", "confidence": 0.9}
  ],
  "overall_trend": "positive",
  "summary": "One sentence describing the overall emotional journey"
}

Return ONLY valid JSON."""


async def analyze_sentiment(transcript: list[dict]) -> tuple[list[dict], str]:
    """
    Analyze sentiment across the conversation.
    Returns (sentiment_entries, overall_summary).
    """
    if not transcript:
        return [], "No transcript available"

    # Only analyze student turns
    student_turns = [t for t in transcript if t["role"] == "user"]
    if not student_turns:
        return [], "No student messages found"

    formatted = "\n".join(
        f"Turn {i + 1} (Student): {t['text']}" for i, t in enumerate(student_turns)
    )

    try:
        client = _get_openai()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SENTIMENT_SYSTEM_PROMPT},
                {"role": "user", "content": f"Conversation:\n\n{formatted}"},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=500,
        )

        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        entries = result.get("entries", [])
        summary = result.get("summary", "")
        logger.info(
            f"Sentiment analysis: {len(entries)} entries, trend: {result.get('overall_trend', 'unknown')}"
        )
        return entries, summary

    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return [], f"Analysis failed: {e}"


# ============================================================
# Full Post-Call Pipeline
# ============================================================


async def run_post_call_pipeline(
    conversation_id: str,
    transcript: list[dict],
    started_at: datetime,
) -> None:
    """
    Execute the complete post-call pipeline:
    1. Extract student data from transcript
    2. Evaluate lead score
    3. Analyze sentiment
    4. Save everything to the database
    5. Create student profile
    6. Send WhatsApp summary (if phone available and lead is warm/hot)
    """
    logger.info(f"Starting post-call pipeline for conversation {conversation_id}")

    # Calculate duration
    ended_at = datetime.now(timezone.utc)
    if started_at is None:
        logger.warning("started_at is None — duration will be 0")
        started_at = ended_at
    duration_secs = int((ended_at - started_at).total_seconds())

    # Run extraction, scoring, and sentiment in parallel
    (
        extracted_data,
        score_result,
        (sentiment_entries, sentiment_summary),
    ) = await asyncio.gather(
        extract_student_data(transcript),
        evaluate_lead_score(transcript, {}),  # Pass empty dict initially
        analyze_sentiment(transcript),
    )

    # Re-evaluate with extracted data for better scoring accuracy
    if extracted_data:
        score_result = await evaluate_lead_score(transcript, extracted_data)

    # 1. Update the conversation with all collected data
    await update_conversation(
        conversation_id,
        transcript=transcript,
        extracted_data=extracted_data,
        sentiment_log=sentiment_entries,
        status="completed",
        ended_at=ended_at.isoformat(),
        duration_secs=duration_secs,
    )

    # 2. Create the lead score
    await create_lead_score(
        conversation_id=conversation_id,
        intent_score=score_result["intent_score"],
        financial_score=score_result["financial_score"],
        timeline_score=score_result["timeline_score"],
        recommended_actions=score_result["recommended_actions"],
        notes=score_result.get("notes", ""),
    )

    # 3. Create student profile if we extracted enough data
    if extracted_data:
        await create_student_profile(extracted_data)

    # 4. Send WhatsApp summary to the student (warm/hot leads with phone number)
    total_score = (
        score_result["intent_score"] * 0.4
        + score_result["financial_score"] * 0.3
        + score_result["timeline_score"] * 0.3
    )
    student_phone = extracted_data.get("phone")
    student_name = extracted_data.get("name", "")

    if student_phone and total_score >= 40:
        try:
            await asyncio.to_thread(
                send_whatsapp_summary,
                student_phone,
                student_name,
                extracted_data,
                score_result,
                conversation_id,
            )
        except Exception as e:
            logger.error(f"WhatsApp dispatch failed (non-blocking): {e}")
    elif student_phone:
        logger.info(
            f"Skipping WhatsApp — lead score {total_score:.0f} is below threshold (40)"
        )
    else:
        logger.info("Skipping WhatsApp — no phone number extracted")

    # 7. Fire report generation to Next.js server (runs independently of agent)
    # The LLM call takes 15-30s and LiveKit kills the agent ~20s after disconnect,
    # so we offload the work to the Next.js server which is NOT tied to LiveKit.
    try:
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        print(f"[REPORT] Firing report generation to {api_base}/api/reports/generate")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{api_base}/api/reports/generate",
                json={
                    "conversation_id": conversation_id,
                    "transcript": transcript,
                    "extracted_data": extracted_data,
                    "score_result": score_result,
                    "sentiment_entries": sentiment_entries,
                },
            )
            print(f"[REPORT] Server responded: {resp.status_code} {resp.text[:200]}")
            if resp.status_code < 300:
                print(f"[REPORT] ✅ Report generation handed off to server")
            else:
                print(f"[REPORT] ❌ Server rejected request: {resp.text}")
    except Exception as e:
        print(f"[REPORT] ❌ Failed to trigger server-side report generation: {e}")
        logger.error(f"Report generation trigger failed: {e}")

    # 8. Fire Slack + Email webhook (runs on the Next.js server)
    # This triggers the Slack alert for hot leads and sends the Resend study plan email.
    try:
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        total_score = (
            score_result.get("intent_score", 0) * 0.4
            + score_result.get("financial_score", 0) * 0.3
            + score_result.get("timeline_score", 0) * 0.3
        )
        print(f"[WEBHOOK] Firing call-ended webhook: score={total_score:.0f}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{api_base}/api/webhook/call-ended",
                json={
                    "conversation_id": conversation_id,
                    "total_score": total_score,
                    "extracted_data": extracted_data,
                    "score_result": score_result,
                },
            )
            print(f"[WEBHOOK] Server responded: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"[WEBHOOK] ❌ Failed to fire call-ended webhook: {e}")
        logger.error(f"Call-ended webhook failed: {e}")

    # 9. Auto-trigger outbound follow-up call for hot leads via Bolna AI
    if (
        student_phone
        and total_score >= 70
        and os.getenv("AUTO_OUTBOUND_ENABLED", "false").lower() == "true"
    ):
        try:
            api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
            webhook_secret = os.getenv("WEBHOOK_SECRET", "")
            print(
                f"[OUTBOUND] Triggering follow-up call for {student_name} ({student_phone}) | score={total_score:.0f}"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{api_base}/api/outbound-calls",
                    headers={"x-webhook-secret": webhook_secret},
                    json={
                        "phone": student_phone,
                        "student_name": student_name or "Student",
                        "conversation_id": conversation_id,
                        "call_type": "follow_up",
                        "triggered_by": "system",
                        "context": extracted_data,
                    },
                )
                print(
                    f"[OUTBOUND] Server responded: {resp.status_code} {resp.text[:200]}"
                )
        except Exception as e:
            print(f"[OUTBOUND] ❌ Outbound call trigger failed: {e}")
            logger.error(f"Outbound call trigger failed: {e}")
    elif student_phone and total_score >= 70:
        logger.info(
            f"Outbound auto-trigger disabled (AUTO_OUTBOUND_ENABLED != true)"
        )

    logger.info(
        f"Post-call pipeline complete for {conversation_id}. "
        f"Extracted {len(extracted_data)} data points. "
        f"Lead score: I={score_result['intent_score']} F={score_result['financial_score']} T={score_result['timeline_score']}"
    )


# ============================================================
# Report Generation
# ============================================================

_REPORT_SYSTEM_PROMPT = """You are a report generation engine for an overseas education consultancy.
Given the student's conversation data, generate a comprehensive post-call report.

Return a single JSON object with these keys:

1. "profile_summary": A formatted summary of the student's profile with these fields:
   - name, email, phone, location, education_level, field_of_study, institution, gpa
   - target_countries, course_interest, test_type, test_score, budget_range, scholarship_interest, timeline

2. "university_recommendations": Array of 5-8 universities with:
   - name, country, city, ranking, course, match_reason
   - category: "ambitious" | "target" | "safe"
   - tuition (estimated), requirements, scholarships (array)

3. "gap_analysis": Object with:
   - strengths: array of current strengths
   - gaps: array of objects with {category, description, action_items}
   - overall_readiness: number (0-100)

4. "personalized_timeline": Array of 12-18 month roadmap milestones:
   - month (number from now), title, description, type, completed (false)

5. "conversation_highlights": Array of key Q&A from the transcript:
   - topic, question, answer, relevance: "high" | "medium" | "low"

6. "next_steps": Array of action items:
   - action, priority: "high" | "medium" | "low", deadline (or null), completed (false)

IMPORTANT:
- For university recommendations, categorize as: Ambitious (top 10% reach), Target (good fit), Safe (backup)
- For gap analysis, identify what's missing and actionable steps to fix it
- For timeline, create realistic milestones for the next 12-18 months
- For conversation highlights, extract the most important questions the student asked
- Return ONLY valid JSON, no markdown, no explanation."""


async def search_universities_for_report(
    query: str, max_results: int = 8
) -> list[dict]:
    """Search universities using the Next.js API."""
    try:
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        print(f"[REPORT] Searching universities: query='{query[:80]}', api={api_base}")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{api_base}/api/universities/search",
                json={"query": query, "maxResults": max_results},
            )
            resp.raise_for_status()
            data = resp.json()
            unis = data.get("universities", []) or []
            print(f"[REPORT] Found {len(unis)} universities")
            return unis
    except Exception as e:
        print(f"[REPORT] ⚠ University search failed (non-fatal): {e}")
        logger.error(f"University search failed for report: {e}")
        return []


async def generate_report_content(
    transcript: list[dict],
    extracted_data: dict,
    score_result: dict,
    sentiment_entries: list[dict],
) -> Optional[dict]:
    """Generate the comprehensive report using LLM."""
    if not transcript:
        logger.warning("No transcript available for report generation")
        return None

    # Build university search query from student profile
    query_parts = []
    if extracted_data.get("field_of_study"):
        query_parts.append(f"studying {extracted_data['field_of_study']}")
    if extracted_data.get("course_interest"):
        query_parts.append(f"interested in {extracted_data['course_interest']}")
    if extracted_data.get("target_countries"):
        query_parts.append(f"targeting {', '.join(extracted_data['target_countries'])}")
    if extracted_data.get("budget_range"):
        query_parts.append(f"budget {extracted_data['budget_range']}")

    university_query = (
        " ".join(query_parts) if query_parts else "undergraduate programs"
    )
    universities = await search_universities_for_report(university_query, max_results=8)

    # Format transcript for LLM
    formatted_transcript = "\n".join(
        f"{'Student' if t['role'] == 'user' else 'Counsellor'}: {t['text']}"
        for t in transcript[:20]  # Limit to first 20 turns for context
    )

    profile_json = json.dumps(extracted_data, indent=2) if extracted_data else "{}"
    score_json = json.dumps(score_result, indent=2)
    sentiment_json = json.dumps(sentiment_entries, indent=2)
    universities_json = json.dumps(universities, indent=2)

    try:
        client = _get_openai()
        print(f"[REPORT] Calling LLM (gpt-4o-mini) for report content...")
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _REPORT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"""
PROFILE DATA:
{profile_json}

LEAD SCORE:
{score_json}

SENTIMENT ANALYSIS:
{sentiment_json}

AVAILABLE UNIVERSITIES:
{universities_json}

CONVERSATION TRANSCRIPT (excerpt):
{formatted_transcript}
""",
                },
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=4000,
        )
        print(f"[REPORT] LLM response received. Parsing JSON...")

        raw = response.choices[0].message.content or "{}"
        report_content = json.loads(raw)

        # Add lead score snapshot and sentiment journey
        report_content["lead_score_snapshot"] = {
            "intent_score": score_result.get("intent_score", 0),
            "financial_score": score_result.get("financial_score", 0),
            "timeline_score": score_result.get("timeline_score", 0),
            "total_score": score_result.get("intent_score", 0) * 0.4
            + score_result.get("financial_score", 0) * 0.3
            + score_result.get("timeline_score", 0) * 0.3,
            "classification": "hot"
            if score_result.get("intent_score", 0) * 0.4
            + score_result.get("financial_score", 0) * 0.3
            + score_result.get("timeline_score", 0) * 0.3
            >= 70
            else "warm"
            if score_result.get("intent_score", 0) * 0.4
            + score_result.get("financial_score", 0) * 0.3
            + score_result.get("timeline_score", 0) * 0.3
            >= 40
            else "cold",
        }
        report_content["sentiment_journey"] = sentiment_entries

        logger.info(f"Report content generated with {len(report_content)} sections")
        return report_content

    except Exception as e:
        print(f"[REPORT] ❌ LLM report generation failed: {e}")
        import traceback
        print(f"[REPORT] Traceback:\n{traceback.format_exc()}")
        logger.error(f"Report content generation failed: {e}")
        return None


async def create_report(conversation_id: str, report_data: dict) -> bool:
    """Create the report in the database with status=ready in a single call."""
    try:
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        print(f"[REPORT] POSTing report to {api_base}/api/reports for conversation {conversation_id}")

        payload = {
            "conversation_id": conversation_id,
            "student_name": report_data.get("profile_summary", {}).get("name"),
            "profile_summary": report_data.get("profile_summary", {}),
            "university_recommendations": report_data.get(
                "university_recommendations", []
            ),
            "gap_analysis": report_data.get("gap_analysis", {}),
            "personalized_timeline": report_data.get(
                "personalized_timeline", []
            ),
            "conversation_highlights": report_data.get(
                "conversation_highlights", []
            ),
            "next_steps": report_data.get("next_steps", []),
            "lead_score_snapshot": report_data.get("lead_score_snapshot", {}),
            "sentiment_journey": report_data.get("sentiment_journey", []),
            "status": "ready",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{api_base}/api/reports",
                json=payload,
            )
            print(f"[REPORT] API response status: {resp.status_code}")
            if resp.status_code >= 400:
                print(f"[REPORT] ❌ API error body: {resp.text}")
            resp.raise_for_status()
            data = resp.json()
            report_id = data.get("report", {}).get("id")

        print(f"[REPORT] ✅ Report {report_id} created and marked as ready")
        logger.info(f"Report {report_id} created and marked as ready")
        return True

    except Exception as e:
        import traceback
        print(f"[REPORT] ❌ create_report EXCEPTION: {e}")
        print(f"[REPORT] Traceback:\n{traceback.format_exc()}")
        logger.error(f"Failed to create report: {e}")
        return False

