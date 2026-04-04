import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { LeadScoreInsert } from "@/lib/types/database";

/**
 * POST /api/leads
 *
 * Create a lead score for a conversation. Called by the agent
 * after a conversation ends and data has been extracted.
 *
 * Body: {
 *   conversation_id: string,
 *   student_id?: string,
 *   intent_score: number (0-100),
 *   financial_score: number (0-100),
 *   timeline_score: number (0-100),
 *   classification: 'hot' | 'warm' | 'cold',
 *   recommended_actions?: string[],
 *   notes?: string
 * }
 */
export async function POST(request: Request) {
	try {
		const body: Partial<LeadScoreInsert> = await request.json();

		if (!body.conversation_id) {
			return NextResponse.json(
				{ error: "conversation_id is required" },
				{ status: 400 },
			);
		}

		// Calculate classification based on weighted total if not provided
		const intentScore = body.intent_score || 0;
		const financialScore = body.financial_score || 0;
		const timelineScore = body.timeline_score || 0;
		const totalScore =
			(intentScore * 40 + financialScore * 30 + timelineScore * 30) / 100;

		let classification = body.classification;
		if (!classification) {
			if (totalScore >= 70) classification = "hot";
			else if (totalScore >= 40) classification = "warm";
			else classification = "cold";
		}

		const leadScore = {
			conversation_id: body.conversation_id,
			student_id: body.student_id || null,
			intent_score: intentScore,
			financial_score: financialScore,
			timeline_score: timelineScore,
			classification,
			recommended_actions: body.recommended_actions || [],
			notes: body.notes || null,
		};

		const { data, error } = await supabase
			.from("lead_scores")
			.insert(leadScore)
			.select("*")
			.single();

		if (error) {
			console.error("Failed to create lead score:", error);
			return NextResponse.json(
				{ error: "Failed to create lead score" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ lead_score: data });
	} catch (error) {
		console.error("Lead score creation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/leads
 *
 * List lead scores with optional filters for the counsellor dashboard.
 * Query params: classification, limit, offset
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const classification = searchParams.get("classification");
		const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
		const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

		let query = supabase
			.from("lead_scores")
			.select(
				`
				*,
				conversations:conversation_id (
					id, room_name, started_at, ended_at, duration_secs, status, language
				)
			`,
				{ count: "exact" },
			)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (classification) {
			query = query.eq("classification", classification);
		}

		const { data, count, error } = await query;

		if (error) {
			console.error("Failed to list leads:", error);
			return NextResponse.json(
				{ error: "Failed to list leads" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ leads: data, total: count });
	} catch (error) {
		console.error("Leads list error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
