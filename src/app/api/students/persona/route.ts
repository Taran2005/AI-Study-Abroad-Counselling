import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/students/persona?phone=+91XXXXXXXXXX
 * GET /api/students/persona?email=student@example.com
 *
 * Looks up an existing student profile by phone or email (exact match).
 * Returns the profile data WITHOUT conversation transcripts for
 * context injection into the voice agent on returning calls.
 *
 * Also returns past lead scores and recent conversation metadata
 * (but NOT full transcripts) for richer context.
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const phone = searchParams.get("phone");
		const email = searchParams.get("email");

		if (!phone && !email) {
			return NextResponse.json(
				{ error: "Provide either phone or email query parameter" },
				{ status: 400 },
			);
		}

		// Step 1: Fetch student profile by exact phone or email match
		let profileQuery = supabase.from("student_profiles").select("*");

		if (phone) {
			// Normalize: try both with/without leading +
			const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
			profileQuery = profileQuery.or(
				`phone.eq.${normalizedPhone},phone.eq.${phone}`,
			);
		} else if (email) {
			profileQuery = profileQuery.ilike("email", email);
		}

		const { data: profiles, error: profileError } =
			await profileQuery.limit(1);

		if (profileError) {
			console.error("[persona] Profile lookup error:", profileError);
			return NextResponse.json(
				{ error: "Database query failed" },
				{ status: 500 },
			);
		}

		if (!profiles || profiles.length === 0) {
			return NextResponse.json({
				found: false,
				profile: null,
				past_conversations: [],
				lead_score: null,
			});
		}

		const profile = profiles[0];

		// Step 2: Fetch past conversation summaries (metadata only, NO transcripts)
		// We look for conversations linked to the same student_id or containing
		// extracted_data with the matching phone/email
		let pastConversations: Array<{
			id: string;
			started_at: string;
			ended_at: string | null;
			duration_secs: number | null;
			status: string;
			extracted_data: Record<string, unknown>;
			language: string | null;
		}> = [];

		if (profile.user_id) {
			const { data: convos } = await supabase
				.from("conversations")
				.select(
					"id, started_at, ended_at, duration_secs, status, extracted_data, language",
				)
				.eq("student_id", profile.user_id)
				.order("started_at", { ascending: false })
				.limit(5);

			pastConversations = convos || [];
		}

		// Step 3: Fetch most recent lead score
		let leadScore: {
			total_score: number;
			classification: string;
			intent_score: number;
			financial_score: number;
			timeline_score: number;
			recommended_actions: string[];
			notes: string | null;
		} | null = null;

		if (profile.user_id) {
			const { data: scores } = await supabase
				.from("lead_scores")
				.select(
					"total_score, classification, intent_score, financial_score, timeline_score, recommended_actions, notes",
				)
				.eq("student_id", profile.user_id)
				.order("created_at", { ascending: false })
				.limit(1);

			leadScore = scores?.[0] || null;
		}

		return NextResponse.json({
			found: true,
			profile: {
				id: profile.id,
				name: profile.name,
				phone: profile.phone,
				email: profile.email,
				location: profile.location,
				education_level: profile.education_level,
				field_of_study: profile.field_of_study,
				institution: profile.institution,
				gpa: profile.gpa,
				target_countries: profile.target_countries,
				course_interest: profile.course_interest,
				preferred_intake: profile.preferred_intake,
				test_type: profile.test_type,
				test_score: profile.test_score,
				budget_range: profile.budget_range,
				scholarship_interest: profile.scholarship_interest,
				timeline: profile.timeline,
			},
			past_conversations: pastConversations.map((c) => ({
				id: c.id,
				date: c.started_at,
				duration_secs: c.duration_secs,
				status: c.status,
				language: c.language,
			})),
			lead_score: leadScore,
		});
	} catch (error) {
		console.error("[persona] Unexpected error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
