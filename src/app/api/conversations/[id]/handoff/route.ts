import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/conversations/[id]/handoff
 *
 * Flags a live conversation as needing a human counsellor.
 * Called by the Python agent when the student asks for a human.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data, error } = await supabase
			.from("conversations")
			.update({ handoff_requested: true })
			.eq("id", id)
			.eq("status", "live")
			.select("id, room_name, handoff_requested")
			.single();

		if (error) {
			console.error("Failed to flag handoff:", error);
			return NextResponse.json(
				{ error: "Failed to flag conversation for handoff" },
				{ status: 500 },
			);
		}

		if (!data) {
			return NextResponse.json(
				{ error: "Conversation not found or not live" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ success: true, conversation: data });
	} catch (error) {
		console.error("Handoff flag error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/conversations/[id]/handoff
 *
 * Check if a conversation has a pending handoff request.
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data, error } = await supabase
			.from("conversations")
			.select("id, room_name, handoff_requested, status")
			.eq("id", id)
			.single();

		if (error || !data) {
			return NextResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			handoff_requested: data.handoff_requested,
			room_name: data.room_name,
			status: data.status,
		});
	} catch (error) {
		console.error("Handoff check error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
