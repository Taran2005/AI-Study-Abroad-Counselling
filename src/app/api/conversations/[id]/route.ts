import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/conversations/[id]
 *
 * Get full conversation details including transcript and sentiment.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data, error } = await supabase
			.from("conversations")
			.select("*")
			.eq("id", id)
			.single();

		if (error || !data) {
			return NextResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}

		// Also fetch the lead score if it exists
		const { data: leadScore } = await supabase
			.from("lead_scores")
			.select("*")
			.eq("conversation_id", id)
			.single();

		return NextResponse.json({
			conversation: data,
			lead_score: leadScore || null,
		});
	} catch (error) {
		console.error("Conversation fetch error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/conversations/[id]
 *
 * Update a conversation (e.g., mark as completed, append transcript, update extracted_data).
 * This is the primary endpoint the agent calls to save session results.
 *
 * Body: Partial conversation fields to update.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const updates = await request.json();

		// Prevent updating protected fields
		const {
			id: _id,
			created_at: _ca,
			...safeUpdates
		} = updates;

		const { data, error } = await supabase
			.from("conversations")
			.update(safeUpdates)
			.eq("id", id)
			.select("id, status, ended_at, duration_secs")
			.single();

		if (error) {
			console.error("Failed to update conversation:", error);
			return NextResponse.json(
				{ error: "Failed to update conversation" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ conversation: data });
	} catch (error) {
		console.error("Conversation update error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
