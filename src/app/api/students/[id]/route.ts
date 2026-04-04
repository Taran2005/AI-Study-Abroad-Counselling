import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/students/[id]
 *
 * Get a full student profile with linked conversations and lead scores.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		// Fetch the student profile
		const { data: profile, error: profileError } = await supabase
			.from("student_profiles")
			.select("*")
			.eq("id", id)
			.single();

		if (profileError || !profile) {
			return NextResponse.json(
				{ error: "Student profile not found" },
				{ status: 404 },
			);
		}

		// Fetch all conversations linked to this student (via user_id)
		let conversations = null;
		let leadScores = null;

		if (profile.user_id) {
			const { data: convos } = await supabase
				.from("conversations")
				.select(
					"id, room_name, started_at, ended_at, duration_secs, status, language, created_at",
				)
				.eq("student_id", profile.user_id)
				.order("created_at", { ascending: false });

			conversations = convos;

			// Fetch lead scores for those conversations
			if (convos && convos.length > 0) {
				const convoIds = convos.map((c) => c.id);
				const { data: scores } = await supabase
					.from("lead_scores")
					.select("*")
					.in("conversation_id", convoIds);

				leadScores = scores;
			}
		}

		return NextResponse.json({
			profile,
			conversations: conversations || [],
			lead_scores: leadScores || [],
		});
	} catch (error) {
		console.error("Student profile fetch error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/students/[id]
 *
 * Update a student profile. Used to progressively add extracted data.
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
			updated_at: _ua,
			...safeUpdates
		} = updates;

		const { data, error } = await supabase
			.from("student_profiles")
			.update(safeUpdates)
			.eq("id", id)
			.select("*")
			.single();

		if (error) {
			console.error("Failed to update student profile:", error);
			return NextResponse.json(
				{ error: "Failed to update student profile" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ profile: data });
	} catch (error) {
		console.error("Student profile update error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
