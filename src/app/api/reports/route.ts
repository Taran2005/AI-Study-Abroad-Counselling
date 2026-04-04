import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Report } from "@/lib/types/database";

/**
 * POST /api/reports
 *
 * Create a new report record (called by Python pipeline)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      conversation_id,
      student_name,
      profile_summary,
      university_recommendations,
      gap_analysis,
      personalized_timeline,
      conversation_highlights,
      next_steps,
      lead_score_snapshot,
      sentiment_journey,
      status: reportStatus,
      generated_at,
    } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 },
      );
    }

    const report: Partial<Report> = {
      conversation_id,
      student_name: student_name || null,
      profile_summary: profile_summary || {},
      university_recommendations: university_recommendations || [],
      gap_analysis: gap_analysis || {},
      personalized_timeline: personalized_timeline || [],
      conversation_highlights: conversation_highlights || [],
      next_steps: next_steps || [],
      lead_score_snapshot: lead_score_snapshot || {},
      sentiment_journey: sentiment_journey || [],
      status: reportStatus || "generating",
      generated_at: generated_at || null,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert(report)
      .select("id, conversation_id, status, created_at")
      .single();

    if (error) {
      console.error("Failed to create report:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Report creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reports
 *
 * List reports, optionally filtered by conversation_id
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("reports")
      .select(
        "id, conversation_id, student_name, status, generated_at, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Failed to list reports:", error);
      return NextResponse.json(
        { error: "Failed to list reports" },
        { status: 500 },
      );
    }

    return NextResponse.json({ reports: data, total: count });
  } catch (error) {
    console.error("Reports list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
