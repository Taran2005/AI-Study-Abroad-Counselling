import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ConversationInsert } from "@/lib/types/database";

/**
 * POST /api/conversations
 *
 * Creates a new conversation record when a voice session starts.
 * Called by the agent or token route when a room is created.
 *
 * Body: { room_name: string, student_id?: string }
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { room_name, student_id } = body;

		if (!room_name) {
			return NextResponse.json(
				{ error: "room_name is required" },
				{ status: 400 },
			);
		}

		const conversation: Partial<ConversationInsert> = {
			room_name,
			student_id: student_id || null,
			status: "live",
			transcript: [],
			sentiment_log: [],
			extracted_data: {},
			language: "en",
		};

		const { data, error } = await supabase
			.from("conversations")
			.insert(conversation)
			.select("id, room_name, status, started_at")
			.single();

		if (error) {
			console.error("Failed to create conversation:", error);
			return NextResponse.json(
				{ error: "Failed to create conversation" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ conversation: data });
	} catch (error) {
		console.error("Conversation creation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/conversations
 *
 * List conversations with optional filters.
 * Query params: status, student_id, limit, offset
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const studentId = searchParams.get("student_id");
		const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
		const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

		let query = supabase
			.from("conversations")
			.select(
				"id, student_id, room_name, started_at, ended_at, duration_secs, status, language, created_at",
				{ count: "exact" },
			)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (status) {
			query = query.eq("status", status);
		}
		if (studentId) {
			query = query.eq("student_id", studentId);
		}

		const { data, count, error } = await query;

		if (error) {
			console.error("Failed to list conversations:", error);
			return NextResponse.json(
				{ error: "Failed to list conversations" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ conversations: data, total: count });
	} catch (error) {
		console.error("Conversations list error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
