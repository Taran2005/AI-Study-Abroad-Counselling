import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI();

const REPORT_SYSTEM_PROMPT = `You are a report generation engine for an overseas education consultancy.
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
- Return ONLY valid JSON, no markdown, no explanation.`;

/**
 * POST /api/reports/generate
 *
 * Generates a full report using OpenAI, independent of the LiveKit agent process.
 * The agent fires this request and doesn't wait for it — the Next.js server handles
 * the LLM call and saves the report to the database.
 *
 * Body: {
 *   conversation_id: string,
 *   transcript: Array<{role, text, ts}>,
 *   extracted_data: object,
 *   score_result: object,
 *   sentiment_entries: Array
 * }
 */
export async function POST(request: Request) {
  // Immediately respond to the caller so it doesn't block
  const body = await request.json();
  const {
    conversation_id,
    transcript,
    extracted_data,
    score_result,
    sentiment_entries,
  } = body;

  if (!conversation_id || !transcript) {
    return NextResponse.json(
      { error: "conversation_id and transcript are required" },
      { status: 400 },
    );
  }

  // Start the async generation (don't await it — respond immediately)
  generateAndSaveReport(
    conversation_id,
    transcript,
    extracted_data || {},
    score_result || {},
    sentiment_entries || [],
  ).catch((err) => {
    console.error(`[REPORT] Background generation failed for ${conversation_id}:`, err);
  });

  return NextResponse.json({ status: "generating", conversation_id });
}

async function generateAndSaveReport(
  conversationId: string,
  transcript: Array<{ role: string; text: string; ts?: string }>,
  extractedData: Record<string, unknown>,
  scoreResult: Record<string, number>,
  sentimentEntries: Array<Record<string, unknown>>,
) {
  console.log(`[REPORT] Starting server-side report generation for ${conversationId}`);

  try {
    // Format transcript for LLM
    const formattedTranscript = transcript
      .slice(0, 20) // Limit to first 20 turns
      .map(
        (t) =>
          `${t.role === "user" ? "Student" : "Counsellor"}: ${t.text}`,
      )
      .join("\n");

    const profileJson = JSON.stringify(extractedData, null, 2);
    const scoreJson = JSON.stringify(scoreResult, null, 2);
    const sentimentJson = JSON.stringify(sentimentEntries, null, 2);

    console.log(`[REPORT] Calling OpenAI gpt-4o-mini for report...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `
PROFILE DATA:
${profileJson}

LEAD SCORE:
${scoreJson}

SENTIMENT ANALYSIS:
${sentimentJson}

CONVERSATION TRANSCRIPT (excerpt):
${formattedTranscript}
`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const raw = response.choices[0].message.content || "{}";
    const reportContent = JSON.parse(raw);

    console.log(`[REPORT] LLM response parsed. Sections: ${Object.keys(reportContent).join(", ")}`);

    // Compute lead score snapshot
    const intentScore = (scoreResult.intent_score as number) || 0;
    const financialScore = (scoreResult.financial_score as number) || 0;
    const timelineScore = (scoreResult.timeline_score as number) || 0;
    const totalScore = intentScore * 0.4 + financialScore * 0.3 + timelineScore * 0.3;

    const leadScoreSnapshot = {
      intent_score: intentScore,
      financial_score: financialScore,
      timeline_score: timelineScore,
      total_score: totalScore,
      classification: totalScore >= 70 ? "hot" : totalScore >= 40 ? "warm" : "cold",
    };

    // Save report to database
    const { data, error } = await supabase
      .from("reports")
      .insert({
        conversation_id: conversationId,
        student_name:
          reportContent.profile_summary?.name ||
          (extractedData.name as string) ||
          null,
        profile_summary: reportContent.profile_summary || {},
        university_recommendations:
          reportContent.university_recommendations || [],
        gap_analysis: reportContent.gap_analysis || {},
        personalized_timeline: reportContent.personalized_timeline || [],
        conversation_highlights: reportContent.conversation_highlights || [],
        next_steps: reportContent.next_steps || [],
        lead_score_snapshot: leadScoreSnapshot,
        sentiment_journey: sentimentEntries,
        status: "ready",
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[REPORT] ❌ Supabase insert failed:`, error);
      return;
    }

    console.log(`[REPORT] ✅ Report ${data.id} saved for conversation ${conversationId}`);
  } catch (err) {
    console.error(`[REPORT] ❌ Report generation error:`, err);

    // Try to create a failed report record so the UI shows something
    try {
      await supabase.from("reports").insert({
        conversation_id: conversationId,
        status: "failed",
        student_name: (extractedData.name as string) || null,
        profile_summary: extractedData,
        lead_score_snapshot: scoreResult,
        sentiment_journey: sentimentEntries,
      });
    } catch {
      // ignore
    }
  }
}
