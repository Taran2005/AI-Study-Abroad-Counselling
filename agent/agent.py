"""
StudyBuddyAI AI Voice Agent
========================
A LiveKit voice agent for overseas education counselling using:
- STT: Google Cloud Speech-to-Text (multilingual: Hindi, English, Marathi, Gujarati)
- LLM: OpenAI GPT-4o (via OpenAI plugin - Responses API)
- TTS: Google Cloud Text-to-Speech (Gemini TTS)
- Avatar: Anam (lifelike avatar video)
- Vision: Video frame sampling from user's camera/screen share
- Fallback: Deepgram STT + OpenAI TTS when Google creds are not configured
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

from data_pipeline import (
    create_conversation,
    update_conversation,
    extract_student_data,
    analyze_sentiment,
    run_post_call_pipeline,
    fetch_student_persona,
    format_persona_context,
)

from livekit import agents, rtc
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    ChatContext,
    ChatMessage,
    TurnHandlingOptions,
    get_job_context,
    room_io,
    llm,
    inference,
)
from livekit.agents.llm import ImageContent
from livekit.agents.voice.events import ConversationItemAddedEvent, CloseEvent
from livekit.plugins import openai, anam, silero, deepgram, elevenlabs, google
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

logger = logging.getLogger("studybuddyai-agent")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("vision_debug.log", mode="w")
fh.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(fh)

# Load knowledge base for system prompt injection
_kb_path = Path(__file__).parent / "knowledge_base.txt"
_knowledge_base = _kb_path.read_text(encoding="utf-8") if _kb_path.exists() else ""


def _build_google_credentials() -> dict | None:
    """
    Build a Google Cloud service account credentials dict from individual
    environment variables. Returns None if required vars are missing.
    """
    project_id = os.getenv("GOOGLE_PROJECT_ID")
    private_key = os.getenv("GOOGLE_PRIVATE_KEY")
    client_email = os.getenv("GOOGLE_CLIENT_EMAIL")

    if not all([project_id, private_key, client_email]):
        logger.info("Google Cloud credentials not configured — will use Deepgram/OpenAI fallback")
        return None

    # CRITICAL: .env loaders often store \n as literal backslash-n.
    # The Google client library needs actual newline characters in the PEM key.
    normalized_key = private_key.replace("\\n", "\n")

    creds = {
        "type": "service_account",
        "project_id": project_id,
        "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID", ""),
        "private_key": normalized_key,
        "client_email": client_email,
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email.replace('@', '%40')}",
        "universe_domain": "googleapis.com",
    }
    logger.info(f"Google Cloud credentials loaded for project: {project_id}")
    return creds


# Pre-build credentials once at module load
_google_creds = _build_google_credentials()


class LunaAssistant(Agent):
    """Luna AI assistant persona with vision capabilities."""

    @llm.function_tool(
        description="Check the counsellor's real-time calendar availability for a given date. Call this when the student wants to book a follow-up consultation and you need to offer them available time slots. Returns a list of available times."
    )
    async def check_availability(
        self,
        date: str,
    ):
        """
        Check available consultation slots for a given date on the counsellor's live calendar.

        Args:
            date: The date to check availability for, in YYYY-MM-DD format (e.g. 2026-04-10).
        """
        logger.info(f"Checking Cal.com availability for {date}")
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{api_base}/api/calcom",
                    params={"action": "slots", "date": date},
                )
                if resp.status_code >= 400:
                    logger.error(f"Cal.com slots API error: {resp.text}")
                    return f"Sorry, I couldn't check the calendar right now. Please try again or visit our booking page directly."

                data = resp.json()
                slots = data.get("slots", {})

                if not slots or all(len(v) == 0 for v in slots.values()):
                    return f"There are no available slots on {date}. Would you like to try a different date?"

                # Format slots: show human-readable time BUT include the raw UTC for booking
                slot_lines = []
                for day, times in slots.items():
                    for t in times:
                        if isinstance(t, dict):
                            slot_lines.append(f"{t['display']} (bookable_utc={t['utc']})")
                        else:
                            slot_lines.append(str(t))

                return (
                    f"Available consultation times on {date}: {', '.join(slot_lines)}. "
                    f"Which time works best for you? "
                    f"IMPORTANT: When the student picks a time, use the exact bookable_utc value as the start_time parameter for book_consultation."
                )

        except Exception as e:
            logger.error(f"Failed to check availability: {e}")
            return "I'm having trouble accessing the calendar. Please try again in a moment."

    @llm.function_tool(
        description="Book a real consultation appointment on the counsellor's calendar. Call this ONLY after: (1) you checked availability using check_availability, (2) the student chose a specific time slot, and (3) the student provided their name and email."
    )
    async def book_consultation(
        self,
        start_time: str,
        student_name: str,
        student_email: str,
    ):
        """
        Book a consultation appointment on the counsellor's live calendar.

        Args:
            start_time: The exact bookable_utc value returned by check_availability for the student's chosen slot (e.g. '2026-04-06T04:00:00.000Z'). Do NOT construct this yourself — copy it directly from check_availability output.
            student_name: The student's full name.
            student_email: The student's email address for the calendar invite.
        """
        logger.info(f"Booking consultation for {student_name} at {start_time}")
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        # Get conversation_id from the agent instance if available
        agent = _agent_instance
        conversation_id = getattr(agent, "_conversation_id", None) if agent else None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{api_base}/api/calcom",
                    json={
                        "start_time": start_time,
                        "attendee_name": student_name,
                        "attendee_email": student_email,
                        "conversation_id": conversation_id,
                    },
                )
                if resp.status_code >= 400:
                    error_text = resp.text
                    logger.error(f"Cal.com booking failed: {error_text}")
                    return f"I'm sorry, I couldn't complete the booking. The slot may no longer be available. Would you like to try a different time?"

                data = resp.json()
                booking = data.get("booking", {})
                booked_time = booking.get("start_time", start_time)

                logger.info(f"Booking confirmed: uid={booking.get('uid')}")
                return f"Your consultation has been booked successfully! A calendar invite has been sent to {student_email}. Your appointment is on {booked_time}. A counsellor will be ready for you."

        except Exception as e:
            logger.error(f"Booking request failed: {e}")
            return "I'm having trouble completing the booking right now. Please try again in a moment."


    @llm.function_tool(
        description="Search for university recommendations based on the student's profile and preferences. Call this when the student wants to know which universities would be a good fit, or when you have enough profile data to suggest options."
    )
    async def search_universities(
        self,
        query: str,
        country: str = "",
    ):
        """
        Search for matching universities using vector similarity.

        Args:
            query: A natural language description of what the student is looking for, including their field of study, budget, test scores, and preferences.
            country: Optional filter — 'UK' or 'Ireland'. Leave empty for both.
        """
        logger.info(f"Searching universities: query='{query}', country='{country}'")

        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            payload: dict = {"query": query, "maxResults": 3}
            if country:
                payload["country"] = country

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    f"{api_base}/api/universities/search",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

            universities = data.get("universities", [])

            if not universities:
                return "I couldn't find matching universities in our database at the moment. Let me share some general recommendations based on my knowledge instead."

            # Format results for the LLM to speak naturally
            results = []
            for i, uni in enumerate(universities, 1):
                parts = [f"{i}. {uni.get('name', 'Unknown')}"]
                if uni.get("city"):
                    parts.append(
                        f"   Location: {uni['city']}, {uni.get('country', '')}"
                    )
                if uni.get("ranking"):
                    parts.append(f"   Ranking: #{uni['ranking']}")

                # Costs
                costs = uni.get("costs", {})
                if costs.get("tuition_min") or costs.get("tuition_max"):
                    currency = costs.get("currency", "GBP")
                    parts.append(
                        f"   Tuition: {currency} {costs.get('tuition_min', 'N/A')} - {costs.get('tuition_max', 'N/A')}"
                    )

                # Requirements
                reqs = uni.get("requirements", {})
                if reqs.get("ielts_min"):
                    parts.append(f"   IELTS Minimum: {reqs['ielts_min']}")

                # Scholarships
                scholarships = uni.get("scholarships", [])
                if scholarships:
                    names = [
                        s.get("name", "") for s in scholarships[:2] if s.get("name")
                    ]
                    if names:
                        parts.append(f"   Scholarships: {', '.join(names)}")

                results.append("\n".join(parts))

            return "Here are the top university matches:\n\n" + "\n\n".join(results)

        except Exception as e:
            logger.error(f"University search failed: {e}")
            return "I'm having trouble searching our university database right now. Let me share recommendations based on my general knowledge instead."

    @llm.function_tool(
        description="Search the internal PDF knowledge base for specific information, policies, visa rules, procedures, or facts that are not about searching for universities."
    )
    async def search_knowledge_base(
        self,
        query: str,
    ):
        """
        Query the PDF vector database for precise information.

        Args:
            query: The specific question or topic to search for in the PDFs.
        """
        logger.info(f"Searching knowledge base for: query='{query}'")

        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    f"{api_base}/api/knowledge/query",
                    json={"query": query, "topK": 3},
                )
                resp.raise_for_status()
                data = resp.json()

            results = data.get("results", [])

            if not results:
                return "I couldn't find any specific information about that in the knowledge base documents. Try answering generally or ask the user to clarify."

            # Format results
            formatted_chunks = []
            for i, res in enumerate(results, 1):
                doc_title = res.get("doc_title", "Unknown Document")
                content = res.get("content", "").strip()
                formatted_chunks.append(
                    f"--- From Document: {doc_title} ---\n{content}"
                )

            return (
                "Here is the information from our internal documents:\n\n"
                + "\n\n".join(formatted_chunks)
            )

        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return "The database is currently unreachable. Rely on your general knowledge to assist the user."

    @llm.function_tool(
        description="Look up a returning student's existing profile from the database using their phone number or email address. Call this IMMEDIATELY after the student provides their phone or email at the start of the conversation. Returns their full profile including past preferences, test scores, budget, and lead score so you can personalize the conversation and skip questions they already answered."
    )
    async def lookup_student_profile(
        self,
        phone: str = "",
        email: str = "",
    ):
        """
        Fetch the persona/profile of a returning student from the database.

        Args:
            phone: The student's phone number (e.g. '+919876543210'). Provide this OR email.
            email: The student's email address. Provide this OR phone.
        """
        if not phone and not email:
            return "I need either a phone number or an email address to look up the student's profile."

        logger.info(f"Looking up student persona: phone={phone}, email={email}")

        persona_data = await fetch_student_persona(
            phone=phone if phone else None,
            email=email if email else None,
        )

        if persona_data is None:
            return "I couldn't reach the database right now. Let's continue as a new conversation and I'll gather your details fresh."

        if not persona_data.get("found"):
            return "No existing profile found for that contact information. This is a new student — proceed with the full questionnaire."

        # Format and return the context string
        context = format_persona_context(persona_data)
        logger.info(f"Persona context loaded: {len(context)} chars")
        return context

    @llm.function_tool(
        description="Transfer the student to a live human counsellor. Call this when the student explicitly asks to speak to a real person, or when you genuinely cannot answer their question and a human would be better suited. After calling this, CONTINUE chatting with the student naturally while they wait."
    )
    async def request_human_counsellor(
        self,
    ):
        """
        Flag this conversation so a human counsellor can join the call.
        The counsellor will see an alert on their dashboard and can click to join.
        """
        conversation_id = getattr(self, "_conversation_id", None)
        if not conversation_id:
            return "I'm unable to request a counsellor right now. Let me try to help you instead."

        logger.info(f"Handoff requested for conversation {conversation_id}")
        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    f"{api_base}/api/conversations/{conversation_id}/handoff",
                )
                resp.raise_for_status()
                logger.info(f"Handoff flagged successfully for {conversation_id}")
                return (
                    "A human counsellor has been notified and will join this call shortly. "
                    "Please continue chatting with me in the meantime — I'm happy to help while you wait!"
                )
        except Exception as e:
            logger.error(f"Failed to request handoff: {e}")
            return "I'm having trouble reaching a counsellor right now. Let me continue helping you instead."

    def __init__(self) -> None:
        self._transcript: list[dict] = []
        self._conversation_id: str | None = None
        self._started_at: datetime | None = None
        self._latest_camera_frame = None
        self._latest_screen_frame = None
        self._camera_stream = None
        self._screen_stream = None
        self._tasks: list = []

        # Build the full system prompt with embedded knowledge base
        kb_section = ""
        if _knowledge_base:
            kb_section = (
                "\n\n=== REFERENCE KNOWLEDGE BASE ===\n"
                "Use this as quick-reference background. For detailed or specific queries, "
                "ALWAYS use the search_knowledge_base tool to get precise, up-to-date information.\n\n"
                f"{_knowledge_base}\n"
                "=== END KNOWLEDGE BASE ===\n"
            )

        super().__init__(
            instructions=(
                "# IDENTITY\n"
                "You are **StudyBuddyAI AI**, a warm, friendly, female overseas education counsellor. "
                "You work for StudyBuddyAI, a consultancy that has helped 45,000+ students get admitted to 120+ partner universities in the UK and Ireland. "
                "You speak naturally, with empathy and encouragement. You sound like a real human counsellor, not a robot.\n"
                "CRITICAL INSTRUCTION ON LANGUAGE: You are fully multilingual and fluent in English, Hindi, Gujarati, Marathi, and Punjabi. "
                "If the student speaks to you in Hindi, Gujarati, Marathi, or Punjabi, YOU MUST RESPOND IN THAT EXACT LANGUAGE. "
                "Never apologize or say you cannot speak a language. You are fully capable of speaking these languages natively.\n\n"

                "# VOICE & TONE\n"
                "- Speak in short, clear sentences (you are a VOICE agent — the student is LISTENING, not reading).\n"
                "- Be warm and encouraging. Use the student's name once you know it.\n"
                "- Celebrate their achievements ('That's a great GPA!', 'Excellent choice!').\n"
                "- Never sound judgmental about low scores or tight budgets — always reframe positively.\n"
                "- Keep responses concise — aim for 2-4 sentences per turn. No essays.\n\n"

                "# SMART QUESTIONNAIRE FLOW\n"
                "Your goal is to build a complete student profile through natural conversation. "
                "Follow this sequence, asking ONE question per turn. Skip questions the student already answered.\n\n"
                "**Phase 0 — Returning Student Check (ALWAYS DO THIS FIRST):**\n"
                "1. Greet warmly and introduce yourself.\n"
                "2. Ask: 'Have you spoken with us before? If so, could you share your phone number or email so I can pull up your profile?'\n"
                "3. If they provide a phone number or email, IMMEDIATELY call the `lookup_student_profile` tool.\n"
                "4. If a profile is found: Welcome them back by name. Summarize what you already know about them in ONE sentence "
                "(e.g. 'I can see you're interested in CS in the UK with an IELTS of 7.0. Let's pick up where we left off!'). "
                "Then SKIP to the next phase where you have missing data. Do NOT re-ask questions you already have answers to.\n"
                "5. If no profile is found, or they say they're new: Say 'No problem! Let me get to know you.' and proceed with Phase 1.\n\n"
                "**Phase 1 — Introduction & Basics:**\n"
                "1. Ask their name.\n"
                "2. Ask what country they want to study in (UK, Ireland, or both).\n"
                "3. Ask whether they're looking at undergraduate or postgraduate.\n\n"
                "**Phase 2 — Academic Profile:**\n"
                "4. Ask their current field of study or what they want to study abroad.\n"
                "5. Ask about their current education (degree, institution, year).\n"
                "6. Ask about their GPA or percentage. If they mention grades, ask them to show their marksheet to the camera.\n\n"
                "**Phase 3 — Test Scores & Readiness:**\n"
                "7. Ask if they've taken IELTS, PTE, or TOEFL. If yes, ask for their score.\n"
                "8. If they haven't taken a test, encourage them and mention that most UK universities need IELTS 6.0-6.5.\n\n"
                "**Phase 4 — Preferences & Budget:**\n"
                "9. Ask about their budget range (tuition + living — give a reference: 'UK typically costs £20,000-£35,000/year for tuition').\n"
                "10. Ask if they're interested in scholarships.\n"
                "11. Ask about preferred intake (September or January) and timeline.\n\n"
                "**Phase 5 — Recommendation & Booking:**\n"
                "12. Once you have enough data (at least country, level, field, and one of GPA/test score), "
                "USE the search_knowledge_base tool to find matching universities and give 3-5 personalised recommendations.\n"
                "13. Ask if they'd like to book a free follow-up consultation with a human counsellor. "
                "If yes, use check_availability to find real slots and book_consultation to confirm.\n"
                "14. Ask for their email and phone number for follow-up (needed for WhatsApp summary and email).\n\n"

                "# TOOL USAGE RULES (CRITICAL)\n"
                "You have access to powerful tools. USE THEM. Do NOT rely on your memory alone.\n\n"
                "## search_knowledge_base (PRIMARY TOOL)\n"
                "- Call this tool for ANY question about: universities, courses, fees, scholarships, "
                "visa requirements, IELTS/PTE requirements, application procedures, living costs, or deadlines.\n"
                "- Call it BEFORE answering factual questions. The knowledge base has verified, accurate data.\n"
                "- If the student asks 'Which universities offer Computer Science in UK?', search for it.\n"
                "- If the student asks 'What IELTS score do I need for Manchester?', search for it.\n"
                "- If the student asks about visa process or documents, search for it.\n"
                "- NEVER guess fees, rankings, or requirements. ALWAYS search first.\n\n"
                "## search_universities\n"
                "- Use this when you want to do a broad vector-similarity search across the university database.\n"
                "- Good for: 'find me affordable universities for MBA in UK'.\n"
                "- If this returns no results, fall back to search_knowledge_base.\n\n"
                "## check_availability + book_consultation\n"
                "- When the student wants to book a follow-up, first call check_availability with a date.\n"
                "- Then call book_consultation with the chosen slot, student name, and email.\n\n"
                "## lookup_student_profile (USE AT START)\n"
                "- Call this IMMEDIATELY after the student provides their phone number or email at the start.\n"
                "- If you get a profile back, use it to personalize the entire conversation.\n"
                "- SKIP all questionnaire questions that already have answers in the profile.\n"
                "- Only ask about missing or outdated data points.\n"
                "- If the student says they are new, skip this tool entirely.\n\n"
                "## request_human_counsellor\n"
                "- Call this ONLY when the student explicitly asks to speak with a real human counsellor.\n"
                "- Also call it if the student seems frustrated and you genuinely cannot help further.\n"
                "- After calling, CONTINUE chatting with the student naturally while they wait for the counsellor to join.\n"
                "- Do NOT tell the student to call back or hang up — a counsellor will join THIS call.\n\n"

                "# VISION CAPABILITIES\n"
                "You have access to the student's camera and screen share when they enable it.\n"
                "- When an image is attached to a user's message, it means their camera or screen share is active.\n"
                "- ALWAYS acknowledge what you see in the image naturally within the conversation context.\n"
                "- If you see a document, marksheet, score card, or transcript, read the relevant details out loud "
                "(name, grades/scores, institution, dates) and confirm them with the student.\n"
                "- If you see a screen with a university website, comment on what you see and offer relevant guidance.\n"
                "- If the image is just a webcam feed of the student, you do NOT need to describe their appearance. "
                "Only mention visual context if it's academically relevant (e.g. they are showing a document).\n"
                "- Example: 'I can see your marksheet. It looks like you scored 85% in your 12th standard — that's excellent!'\n\n"
                "# IMPORTANT RULES\n"
                "- Ask ONLY ONE question per turn. Wait for the answer.\n"
                "- If the student gives short answers ('yes', 'no', 'UK'), acknowledge and move to the next question.\n"
                "- If the student asks something off-topic, gently steer back.\n"
                "- Always use the search_knowledge_base tool before recommending universities or quoting facts.\n"
                "- When recommending universities, mention: name, location, key course, approximate tuition, and one scholarship if available.\n"
                "- Never fabricate university names, fees, or requirements.\n"
                f"{kb_section}"
            ),
        )

    @property
    def latest_frame(self):
        return (
            self._latest_screen_frame
            if self._latest_screen_frame
            else self._latest_camera_frame
        )

    async def on_enter(self) -> None:
        """Set up video tracks and create conversation record in Supabase."""
        room = get_job_context().room
        logger.info("StudyBuddyAIAssistant on_enter: setting up video track handlers")

        # Immediately create conversation so it appears LIVE on the dashboard
        self._conversation_id = await create_conversation(room.name)
        self._session_started_at = datetime.now(timezone.utc)

        for participant in room.remote_participants.values():
            for publication in participant.track_publications.values():
                if (
                    publication.track
                    and publication.track.kind == rtc.TrackKind.KIND_VIDEO
                    and participant.identity != "anam-avatar-agent"
                ):
                    self._create_video_stream(
                        publication.track,
                        publication.source == rtc.TrackSource.SOURCE_SCREENSHARE,
                    )

        @room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            if (
                track.kind == rtc.TrackKind.KIND_VIDEO
                and participant.identity != "anam-avatar-agent"
            ):
                self._create_video_stream(
                    track,
                    publication.source == rtc.TrackSource.SOURCE_SCREENSHARE,
                )

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        """Inject the latest video frame into the user's VOICE message before sending to LLM."""
        frame = self.latest_frame
        if frame:
            if isinstance(new_message.content, str):
                new_message.content = [new_message.content]
            new_message.content.append(ImageContent(image=frame))
            self._latest_camera_frame = None
            self._latest_screen_frame = None
        else:
            logger.debug("No video frame available for this voice turn")

    def _create_video_stream(self, track: rtc.Track, is_screen_share: bool = False):
        """Opens a VideoStream on the given track and continuously buffers the latest frame."""
        stream_type = "screen share" if is_screen_share else "camera"
        logger.info(f"Creating {stream_type} video stream for track: {track.sid}")

        # Close any existing stream of this type
        if is_screen_share and self._screen_stream is not None:
            self._screen_stream.close()
        elif not is_screen_share and self._camera_stream:
            self._camera_stream.close()

        video_stream = rtc.VideoStream(track)
        if is_screen_share:
            self._screen_stream = video_stream
        else:
            self._camera_stream = video_stream

        async def read_stream():
            async for event in video_stream:
                if is_screen_share:
                    self._latest_screen_frame = event.frame
                else:
                    self._latest_camera_frame = event.frame

        task = asyncio.create_task(read_stream())
        task.add_done_callback(
            lambda t: self._tasks.remove(t) if t in self._tasks else None
        )
        self._tasks.append(task)


server = AgentServer()

# Global reference to the agent instance so the text_input_cb can access it
_agent_instance: LunaAssistant | None = None


async def vision_text_input_cb(
    session: AgentSession, event: room_io.TextInputEvent
) -> None:
    global _agent_instance
    content: list = [event.text]

    # Note: Transcript is already captured via conversation_item_added event
    # Only add video frame if available
    if _agent_instance:
        frame = _agent_instance.latest_frame
        if frame:
            content.append(ImageContent(image=frame))
            _agent_instance._latest_camera_frame = None
            _agent_instance._latest_screen_frame = None

    user_msg = ChatMessage(role="user", content=content)
    await session.interrupt()
    session.generate_reply(user_input=user_msg)


@server.rtc_session(agent_name="studybuddyai-agent")
async def studybuddyai_agent(ctx: agents.JobContext):
    """Entry point for the Luna voice agent session."""
    global _agent_instance

    room_name = ctx.room.name
    logger.info(f"Starting StudyBuddyAI session in room: {room_name}")

    # Build STT and TTS — use Google Cloud if credentials are available, else fallback
    if _google_creds:
        logger.info("Using Google Cloud STT + OpenAI TTS (multilingual STT, female TTS)")
        agent_stt = google.STT(
            languages=["en-IN", "hi-IN", "mr-IN", "gu-IN", "pa-IN"],
            detect_language=True,
            model="latest_long",
            credentials_info=_google_creds,
        )
        agent_tts = google.TTS(
            language="en-US",
            voice_name="en-US-Chirp3-HD-Aoede",
            model_name="chirp_3",
            credentials_info=_google_creds,
        )
    else:
        logger.info("Using Deepgram STT + OpenAI TTS (fallback)")
        agent_stt = deepgram.STT(model="nova-3", language="en-IN")
        agent_tts = openai.TTS(voice="nova")

    session = AgentSession(
        stt=agent_stt,
        llm=openai.responses.LLM(model="gpt-4o"),
        tts=agent_tts,
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(turn_detection=MultilingualModel()),
    )

    avatar = anam.AvatarSession(
        persona_config=anam.PersonaConfig(
            name=os.environ.get("ANAM_AVATAR_NAME", "Luna"),
            avatarId=os.environ.get("ANAM_AVATAR_ID", "071b0286-4cce-4808-bee2-e642f1062de3"),
        ),
    )

    # Start the agent session with the user, using custom text input handler for vision
    # NOTE: Do NOT call on_enter() manually — session.start() triggers it automatically
    # via the Agent lifecycle. Manual call would double-register event handlers.
    _agent_instance = LunaAssistant()
    await session.start(
        room=ctx.room,
        agent=_agent_instance,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(text_input_cb=vision_text_input_cb),
        ),
    )

    # Start the avatar AFTER the session so it can sync with the TTS output
    await avatar.start(session, room=ctx.room)

    # ── Live Transcript Capture ──
    @session.on("conversation_item_added")
    def _on_conversation_item_added(event: ConversationItemAddedEvent):
        """Capture every user/assistant message into the local transcript list."""
        if not isinstance(event.item, llm.ChatMessage):
            return
        msg = event.item
        if msg.role not in ("user", "assistant"):
            return
        # Extract text content
        text = ""
        if isinstance(msg.content, str):
            text = msg.content
        elif isinstance(msg.content, list):
            text = " ".join(str(c) for c in msg.content if isinstance(c, str))
        if not text.strip():
            return
        _agent_instance._transcript.append(
            {
                "role": msg.role,
                "text": text.strip(),
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.debug(f"Transcript captured: [{msg.role}] {text[:80]}...")

        # Immediately push transcript to DB for near-real-time dashboard updates
        async def _push_transcript():
            agent = _agent_instance
            if agent._conversation_id:
                try:
                    await update_conversation(
                        agent._conversation_id,
                        transcript=list(agent._transcript),
                    )
                except Exception as e:
                    logger.debug(f"Immediate transcript push failed (non-fatal): {e}")

        asyncio.create_task(_push_transcript())

    # ── Periodic Live Sync (every 5 seconds) ──
    async def _live_sync_loop():
        """Background loop: push transcript + sentiment + extracted data to DB."""
        agent = _agent_instance
        while True:
            await asyncio.sleep(5)
            if not agent._conversation_id or not agent._transcript:
                continue
            try:
                transcript = list(agent._transcript)  # snapshot
                # Run extraction and sentiment in parallel
                extracted, (sentiment_entries, _) = await asyncio.gather(
                    extract_student_data(transcript),
                    analyze_sentiment(transcript),
                )
                await update_conversation(
                    agent._conversation_id,
                    transcript=transcript,
                    extracted_data=extracted,
                    sentiment_log=sentiment_entries,
                )
                logger.info(
                    f"Live sync: pushed {len(transcript)} msgs, {len(extracted)} fields"
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Live sync failed (non-fatal): {e}")

    sync_task = asyncio.create_task(_live_sync_loop())

    _pipeline_ran = False
    _pipeline_done = asyncio.Event()

    async def _run_close_pipeline():
        nonlocal _pipeline_ran
        if _pipeline_ran:
            print("[PIPELINE] Already ran — skipping duplicate call")
            return
        _pipeline_ran = True
        sync_task.cancel()

        agent = _agent_instance
        conversation_id = getattr(agent, "_conversation_id", None)

        print(f"[PIPELINE] Close pipeline triggered. conversation_id={conversation_id}")

        if not conversation_id:
            print("[PIPELINE] ❌ No conversation ID found — cannot run pipeline")
            logger.warning("No conversation ID found — cannot update status")
            _pipeline_done.set()
            return

        # Always mark as completed first (in case pipeline fails)
        await update_conversation(
            conversation_id,
            status="completed",
            ended_at=datetime.now(timezone.utc).isoformat(),
        )
        print(f"[PIPELINE] Conversation {conversation_id} marked as completed")

        transcript = getattr(agent, "_transcript", None)
        print(f"[PIPELINE] Transcript has {len(transcript) if transcript else 0} messages")

        if agent and transcript:
            print(f"[PIPELINE] Starting post-call pipeline for {conversation_id}")
            logger.info(
                f"Session ended — running post-call pipeline for {conversation_id}"
            )
            try:
                await run_post_call_pipeline(
                    conversation_id=conversation_id,
                    transcript=agent._transcript,
                    started_at=getattr(agent, "_session_started_at", None),
                )
                print(f"[PIPELINE] ✅ Post-call pipeline finished for {conversation_id}")
            except Exception as e:
                import traceback
                print(f"[PIPELINE] ❌ Post-call pipeline EXCEPTION: {e}")
                print(f"[PIPELINE] Traceback:\n{traceback.format_exc()}")
                logger.error(f"Post-call pipeline failed: {e}")
        else:
            print("[PIPELINE] ⚠ Empty transcript — skipping pipeline")
            logger.info("Session ended with empty transcript — marked as completed")

        # Signal that the pipeline is done so the job can exit
        _pipeline_done.set()

    # ── Session Close: Primary handler ──
    @session.on("close")
    def _on_session_close(event: CloseEvent):
        asyncio.create_task(_run_close_pipeline())

    # ── Room Disconnect: Fallback handler ──
    @ctx.room.on("disconnected")
    def _on_room_disconnected():
        asyncio.create_task(_run_close_pipeline())

    # Generate an initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly and introduce yourself as StudyBuddyAI. Offer your assistance."
    )

    # ── Human Counsellor Handoff Detection ──
    @ctx.room.on("participant_connected")
    def _on_participant_connected(participant: rtc.RemoteParticipant):
        """Detect when a counsellor joins the room and hand off the conversation."""
        if participant.identity.startswith("counsellor-"):
            logger.info(f"Counsellor joined: {participant.identity} ({participant.name})")
            asyncio.create_task(_handover_and_leave(participant))

    async def _handover_and_leave(participant: rtc.RemoteParticipant):
        """Leave the room immediately once a counsellor joins."""
        logger.info("Agent departing room instantly after counsellor handoff")
        
        # Trigger the close pipeline (marks conversation as completed, runs post-call)
        await _run_close_pipeline()
        # Disconnect the agent from the room silently
        await ctx.room.disconnect()

    # ── CRITICAL: Keep the job alive until the post-call pipeline finishes ──
    # Without this, LiveKit kills the job ~20s after disconnect, before the
    # report LLM call can finish (which takes 15-30s).
    print("[AGENT] Waiting for session close and pipeline to complete...")
    await _pipeline_done.wait()
    print("[AGENT] Pipeline done — job exiting cleanly")


if __name__ == "__main__":
    agents.cli.run_app(server)
