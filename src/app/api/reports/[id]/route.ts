import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/reports/[id]
 *
 * Fetch single report with full JSONB sections
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/reports/[id]
 *
 * Update report status (generating → ready / failed) or update report data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const allowedFields = [
      "status",
      "profile_summary",
      "university_recommendations",
      "gap_analysis",
      "personalized_timeline",
      "conversation_highlights",
      "next_steps",
      "lead_score_snapshot",
      "sentiment_journey",
      "generated_at",
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("reports")
      .update(filteredUpdates)
      .eq("id", id)
      .select("id, status, generated_at")
      .single();

    if (error) {
      console.error("Failed to update report:", error);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
