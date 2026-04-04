import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/outbound-calls/[id]
 * Returns a single outbound call with all its data.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	const { data, error } = await supabase
		.from("outbound_calls")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !data) {
		return NextResponse.json({ error: "Call not found" }, { status: 404 });
	}

	return NextResponse.json(data);
}

/**
 * PATCH /api/outbound-calls/[id]
 * Update call notes, outcome, or status.
 *
 * Body: { call_outcome?, call_status?, call_summary? }
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	// Only allow updating specific fields
	const allowedFields = ["call_outcome", "call_status", "call_summary"];
	const updates: Record<string, unknown> = {};
	for (const key of allowedFields) {
		if (body[key] !== undefined) {
			updates[key] = body[key];
		}
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const { data, error } = await supabase
		.from("outbound_calls")
		.update(updates)
		.eq("id", id)
		.select("id, call_status, call_outcome")
		.single();

	if (error || !data) {
		console.error("[outbound-calls] Failed to update:", error);
		return NextResponse.json(
			{ error: "Failed to update call" },
			{ status: 500 },
		);
	}

	return NextResponse.json(data);
}
