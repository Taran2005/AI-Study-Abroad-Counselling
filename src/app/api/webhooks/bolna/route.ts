import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/webhooks/bolna
 *
 * Receives post-call execution data from Bolna AI when an outbound call completes.
 * Updates the corresponding outbound_calls row with transcript, extracted data,
 * call outcome, duration, and recording URL.
 *
 * Bolna webhook payload shape:
 * {
 *   id: string,              // execution_id
 *   agent_id: string,
 *   status: string,          // "completed" | "in-progress" etc.
 *   transcript: string,
 *   extracted_data: { ... },  // From extraction prompts
 *   telephony_data: {
 *     duration: number,
 *     to_number: string,
 *     from_number: string,
 *     recording_url?: string,
 *     hangup_by?: string,
 *   }
 * }
 */

interface BolnaTelephonyData {
	duration?: number;
	to_number?: string;
	from_number?: string;
	recording_url?: string;
	hangup_by?: string;
	hangup_reason?: string;
}

interface BolnaExtractedData {
	call_outcome?: string;
	student_name?: string;
	student_email?: string;
	target_country?: string;
	education_level?: string;
	course_interest?: string;
	test_type?: string;
	test_score?: string;
	budget_range?: string;
	scholarship_interest?: string;
	consultation_booked?: string;
	key_concerns?: string;
	call_summary?: string;
	[key: string]: unknown;
}

interface BolnaWebhookPayload {
	id: string;
	agent_id?: string;
	status?: string;
	transcript?: string;
	extracted_data?: BolnaExtractedData;
	telephony_data?: BolnaTelephonyData;
}

export async function POST(req: NextRequest) {
	// Optional: Verify webhook secret
	const secret = req.headers.get("x-webhook-secret");
	if (
		process.env.BOLNA_WEBHOOK_SECRET &&
		secret !== process.env.BOLNA_WEBHOOK_SECRET
	) {
		// Also allow Bolna's IP if no secret header
		// Bolna webhook IP: 13.203.39.153
		console.warn("[bolna-webhook] Unauthorized webhook attempt");
	}

	let payload: BolnaWebhookPayload;
	try {
		payload = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!payload.id) {
		return NextResponse.json(
			{ error: "Missing execution_id (id)" },
			{ status: 400 },
		);
	}

	console.log(
		`[bolna-webhook] Received callback for execution=${payload.id} status=${payload.status}`,
	);

	const telephony = payload.telephony_data || {};
	const extracted = payload.extracted_data || {};
	const callOutcome = extracted.call_outcome || null;
	const callSummary = extracted.call_summary || null;

	// Map Bolna status to our call_status
	let callStatus = "completed";
	if (payload.status === "in-progress") {
		callStatus = "in-progress";
	} else if (payload.status === "failed" || payload.status === "error") {
		callStatus = "failed";
	}

	// If outcome indicates no answer
	if (callOutcome === "no_answer" || callOutcome === "voicemail") {
		callStatus = "completed"; // Call completed but nobody picked up or went to voicemail
	}

	// Try to find existing row by execution_id
	const { data: existing } = await supabase
		.from("outbound_calls")
		.select("id")
		.eq("bolna_execution_id", payload.id)
		.single();

	if (existing) {
		// Update existing row
		const { error: updateError } = await supabase
			.from("outbound_calls")
			.update({
				call_status: callStatus,
				call_outcome: callOutcome,
				call_summary: callSummary,
				transcript: payload.transcript || null,
				extracted_data: extracted,
				recording_url: telephony.recording_url || null,
				duration_secs: telephony.duration || 0,
				ended_at: new Date().toISOString(),
				student_email:
					extracted.student_email || undefined,
			})
			.eq("id", existing.id);

		if (updateError) {
			console.error("[bolna-webhook] Failed to update outbound call:", updateError);
			return NextResponse.json(
				{ error: "Failed to update call record" },
				{ status: 500 },
			);
		}

		console.log(
			`[bolna-webhook] Updated call ${existing.id} | outcome=${callOutcome} | duration=${telephony.duration}s`,
		);
	} else {
		// No existing row — create a new record (for calls triggered outside our system)
		const { error: insertError } = await supabase
			.from("outbound_calls")
			.insert({
				bolna_execution_id: payload.id,
				bolna_agent_id: payload.agent_id || null,
				student_phone: telephony.to_number || "unknown",
				student_name: extracted.student_name || null,
				student_email: extracted.student_email || null,
				call_type: "follow_up",
				call_status: callStatus,
				call_outcome: callOutcome,
				call_summary: callSummary,
				transcript: payload.transcript || null,
				extracted_data: extracted,
				recording_url: telephony.recording_url || null,
				duration_secs: telephony.duration || 0,
				ended_at: new Date().toISOString(),
				triggered_by: "system",
			});

		if (insertError) {
			console.error("[bolna-webhook] Failed to insert outbound call:", insertError);
			return NextResponse.json(
				{ error: "Failed to create call record" },
				{ status: 500 },
			);
		}

		console.log(
			`[bolna-webhook] Created new call record | phone=${telephony.to_number} | outcome=${callOutcome}`,
		);
	}

	return NextResponse.json({ ok: true, execution_id: payload.id });
}
