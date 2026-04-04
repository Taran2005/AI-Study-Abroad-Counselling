import { NextRequest, NextResponse } from "next/server";

/**
 * Post-call chain reaction webhook.
 * Agent's data_pipeline.py POSTs here at end of run_post_call_pipeline.
 * Fires Slack alert (hot leads) + Resend study plan email in parallel.
 */
export interface CallEndedPayload {
  conversation_id: string;
  total_score: number; // weighted: intent*0.4 + financial*0.3 + timeline*0.3
  extracted_data: {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    education_level?: string;
    field_of_study?: string;
    institution?: string;
    gpa?: string;
    target_countries?: string[];
    course_interest?: string;
    preferred_intake?: string;
    test_type?: string;
    test_score?: string;
    budget_range?: string;
    scholarship_interest?: boolean;
    timeline?: string;
  };
  score_result: {
    intent_score: number;
    financial_score: number;
    timeline_score: number;
    recommended_actions: string[];
    sentiment_summary?: string;
    notes?: string;
  };
}

// ─── Slack ────────────────────────────────────────────────────────────────────

async function sendSlackAlert(payload: CallEndedPayload): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const { extracted_data: s, score_result: r, total_score } = payload;
  const name = s.name || "Unknown Student";
  const destinations = (s.target_countries ?? []).join(", ") || "Not specified";
  const actions = r.recommended_actions
    .slice(0, 3)
    .map((a, i) => `${i + 1}. ${a}`)
    .join("\n");

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🔥 Hot Lead — ${name}`, emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Score:*\n${total_score}/100` },
            { type: "mrkdwn", text: `*Breakdown:*\nIntent ${r.intent_score} · Financial ${r.financial_score} · Timeline ${r.timeline_score}` },
            { type: "mrkdwn", text: `*Destination:*\n${destinations}` },
            { type: "mrkdwn", text: `*Course:*\n${s.course_interest || "Not specified"}` },
            { type: "mrkdwn", text: `*Phone:*\n${s.phone || "Not provided"}` },
            { type: "mrkdwn", text: `*Email:*\n${s.email || "Not provided"}` },
            { type: "mrkdwn", text: `*Budget:*\n${s.budget_range || "Not discussed"}` },
            { type: "mrkdwn", text: `*Timeline:*\n${s.timeline || "Not discussed"}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Notes:*\n${r.notes || "—"}` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Next Steps:*\n${actions}` },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "📅 Book Follow-Up" },
              url: process.env.CAL_BOOKING_URL ?? "#",
              style: "primary",
            },
          ],
        },
      ],
    }),
  });
}

// ─── Resend Email ─────────────────────────────────────────────────────────────

async function sendStudyPlanEmail(payload: CallEndedPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = payload.extracted_data.email;
  if (!apiKey || !from || !to) return;

  const { extracted_data: s, score_result: r, total_score } = payload;
  const name = s.name || "there";
  const destinations = (s.target_countries ?? []).join(" & ") || "your chosen destination";
  const actionItems = r.recommended_actions
    .map((a) => `<li style="margin:6px 0">${a}</li>`)
    .join("");
  const calUrl = process.env.CAL_BOOKING_URL ?? "#";

  const html = `
<html><body style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;color:#111">
  <div style="background:#1a56db;padding:24px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">Your StudyBuddyAI Study Plan 📚</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
    <p>Hi ${name},</p>
    <p>Thank you for your StudyBuddyAI session! Here's your personalised study plan.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Destination</td><td style="padding:10px;border:1px solid #e5e7eb">${(s.target_countries ?? []).join(", ") || "TBC"}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Course</td><td style="padding:10px;border:1px solid #e5e7eb">${s.course_interest || "TBC"}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Education</td><td style="padding:10px;border:1px solid #e5e7eb">${s.education_level || "Not specified"}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">English Test</td><td style="padding:10px;border:1px solid #e5e7eb">${s.test_type || "Not taken"}${s.test_score ? ` — ${s.test_score}` : ""}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Budget</td><td style="padding:10px;border:1px solid #e5e7eb">${s.budget_range || "TBC"}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Intake</td><td style="padding:10px;border:1px solid #e5e7eb">${s.preferred_intake || "Not specified"}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Timeline</td><td style="padding:10px;border:1px solid #e5e7eb">${s.timeline || "TBC"}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">Lead Score</td><td style="padding:10px;border:1px solid #e5e7eb">${total_score}/100</td></tr>
    </table>
    <h2 style="color:#1a56db">📋 Session Notes</h2>
    <p style="background:#f0f4ff;padding:16px;border-radius:8px;border-left:4px solid #1a56db">${r.notes || "Our counsellor will follow up with personalised guidance."}</p>
    <h2 style="color:#1a56db">✅ Next Steps</h2>
    <ol>${actionItems}</ol>
    <a href="${calUrl}" style="background:#1a56db;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;margin-top:16px">Book Follow-Up Call →</a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="color:#9ca3af;font-size:12px;margin:0">StudyBuddyAI — AI-Powered Study Abroad Counselling</p>
  </div>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Your Personalised Study Plan — ${destinations} 🎓`,
      html,
    }),
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CallEndedPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.conversation_id || payload.total_score === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: conversation_id, total_score" },
      { status: 400 }
    );
  }

  const { total_score, extracted_data } = payload;
  const results = { slack: false, email: false };

  // Fire Slack + email in parallel — neither blocks the response
  await Promise.allSettled([
    total_score >= 70
      ? sendSlackAlert(payload).then(() => { results.slack = true; })
      : Promise.resolve(),
    extracted_data.email
      ? sendStudyPlanEmail(payload).then(() => { results.email = true; })
      : Promise.resolve(),
  ]);

  console.log(
    `[call-ended] ${extracted_data.name || payload.conversation_id} | score=${total_score} | slack=${results.slack} | email=${results.email}`
  );

  return NextResponse.json({ ok: true, ...results });
}
