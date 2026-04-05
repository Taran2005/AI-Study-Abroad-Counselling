import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/outbound-calls
 *
 * Triggers an outbound call via the Bolna AI API.
 * Creates a record in outbound_calls table, then calls Bolna's POST /call endpoint.
 *
 * Body: {
 *   phone: "+91XXXXXXXXXX",
 *   student_name?: string,
 *   conversation_id?: string,
 *   call_type?: "follow_up" | "appointment_confirm" | "re_engage",
 *   context?: Record<string, unknown>,   // injected as user_data into Bolna
 *   triggered_by?: "system" | "admin",
 * }
 */

interface TriggerCallBody {
	phone: string;
	student_name?: string;
	conversation_id?: string;
	call_type?: string;
	context?: Record<string, unknown>;
	triggered_by?: string;
}

export async function POST(req: NextRequest) {
	// Auth check — require webhook secret for system triggers
	const secret = req.headers.get("x-webhook-secret");
	const isSystemCall =
		process.env.WEBHOOK_SECRET && secret === process.env.WEBHOOK_SECRET;

	// For admin triggers, we rely on the /admin route guarding
	// For system triggers (from data_pipeline), we check the webhook secret

	let body: TriggerCallBody;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!body.phone) {
		return NextResponse.json(
			{ error: "Missing required field: phone" },
			{ status: 400 },
		);
	}

	// Validate env vars
	const bolnaApiKey = process.env.BOLNA_API_KEY;
	const bolnaAgentId = process.env.BOLNA_AGENT_ID;
	const bolnaFromPhone = process.env.BOLNA_FROM_PHONE;

	if (!bolnaApiKey || !bolnaAgentId) {
		console.error("[outbound-calls] Missing BOLNA_API_KEY or BOLNA_AGENT_ID");
		return NextResponse.json(
			{ error: "Bolna AI not configured" },
			{ status: 500 },
		);
	}

	const callType = body.call_type || "follow_up";
	const triggeredBy = body.triggered_by || (isSystemCall ? "system" : "admin");

	// Try to hydrate dynamic placeholder variables from student_profiles using the phone number
	let dbContext: any = {};
	if (!body.context) {
		const { data: profile } = await supabase
			.from("student_profiles")
			.select("*")
			.eq("phone", body.phone)
			.single();
			
		if (profile) {
			dbContext = profile;
		}
	}

	// Build user_data for Bolna agent prompt injection with smart fallback defaults
	const userData: Record<string, unknown> = {
		agent_name: "StudyBuddyAI Follow-Up",
		student_name: body.student_name || dbContext.name || "Student",
		target_country: (dbContext.target_countries && dbContext.target_countries[0]) || "your preferred destination",
		course_interest: dbContext.course_interest || "your chosen field",
		education_level: dbContext.education_level || "higher education",
		test_type: dbContext.test_type || "English proficiency test",
		test_score: dbContext.test_score || "your scores",
		budget_range: dbContext.budget_range || "your budget",
		call_type: callType,
		...(body.context || {}),
	};

	// Step 1: Insert row into outbound_calls
	const { data: callRecord, error: insertError } = await supabase
		.from("outbound_calls")
		.insert({
			student_phone: body.phone,
			student_name: body.student_name || null,
			conversation_id: body.conversation_id || null,
			call_type: callType,
			call_status: "queued",
			triggered_by: triggeredBy,
			user_data: userData,
		})
		.select("id")
		.single();

	if (insertError || !callRecord) {
		console.error("[outbound-calls] Failed to create call record:", insertError);
		return NextResponse.json(
			{ error: "Failed to create call record" },
			{ status: 500 },
		);
	}

	// Step 2: Call Bolna API to initiate outbound call
	try {
		const bolnaPayload: Record<string, unknown> = {
			agent_id: bolnaAgentId,
			recipient_phone_number: body.phone,
			user_data: userData,
		};

		// Only include from_phone if configured
		if (bolnaFromPhone) {
			bolnaPayload.from_phone_number = bolnaFromPhone;
		}

		const bolnaResp = await fetch("https://api.bolna.ai/call", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${bolnaApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(bolnaPayload),
		});

		if (!bolnaResp.ok) {
			const errText = await bolnaResp.text();
			console.error(
				`[outbound-calls] Bolna API error (${bolnaResp.status}):`,
				errText,
			);

			// Update row to failed
			await supabase
				.from("outbound_calls")
				.update({ call_status: "failed" })
				.eq("id", callRecord.id);

			return NextResponse.json(
				{ error: "Bolna API call failed", details: errText },
				{ status: 502 },
			);
		}

		const bolnaData = await bolnaResp.json();
		const executionId = bolnaData.execution_id;

		// Step 3: Update row with Bolna execution_id
		await supabase
			.from("outbound_calls")
			.update({
				bolna_execution_id: executionId,
				bolna_agent_id: bolnaAgentId,
				call_status: "queued",
			})
			.eq("id", callRecord.id);

		console.log(
			`[outbound-calls] Call triggered | id=${callRecord.id} | execution=${executionId} | phone=${body.phone}`,
		);

		return NextResponse.json({
			id: callRecord.id,
			execution_id: executionId,
			status: "queued",
			phone: body.phone,
		});
	} catch (error) {
		console.error("[outbound-calls] Bolna API request failed:", error);

		await supabase
			.from("outbound_calls")
			.update({ call_status: "failed" })
			.eq("id", callRecord.id);

		return NextResponse.json(
			{ error: "Failed to connect to Bolna API" },
			{ status: 502 },
		);
	}
}

/**
 * GET /api/outbound-calls
 *
 * List outbound calls with optional filters and pagination.
 * Query params: status, outcome, call_type, limit (default 20), offset (default 0)
 */
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const status = searchParams.get("status");
	const outcome = searchParams.get("outcome");
	const callType = searchParams.get("call_type");
	const limit = parseInt(searchParams.get("limit") || "20", 10);
	const offset = parseInt(searchParams.get("offset") || "0", 10);

	let query = supabase
		.from("outbound_calls")
		.select("*", { count: "exact" })
		.order("initiated_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (status) query = query.eq("call_status", status);
	if (outcome) query = query.eq("call_outcome", outcome);
	if (callType) query = query.eq("call_type", callType);

	const { data, count, error } = await query;

	if (error) {
		console.error("[outbound-calls] Failed to list calls:", error);
		return NextResponse.json(
			{ error: "Failed to fetch outbound calls" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		calls: data || [],
		total: count || 0,
		limit,
		offset,
	});
}
