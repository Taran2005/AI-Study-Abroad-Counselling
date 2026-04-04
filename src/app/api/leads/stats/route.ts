import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/leads/stats
 *
 * Returns aggregated lead statistics for the dashboard overview.
 * - Total counts by classification (hot, warm, cold)
 * - Today's lead count
 * - Average scores
 */
export async function GET() {
	try {
		// Get counts by classification
		const { data: allLeads, error: leadsError } = await supabase
			.from("lead_scores")
			.select("classification, total_score, created_at");

		if (leadsError) {
			console.error("Failed to fetch lead stats:", leadsError);
			return NextResponse.json(
				{ error: "Failed to fetch lead stats" },
				{ status: 500 },
			);
		}

		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).toISOString();

		const stats = {
			total: allLeads?.length || 0,
			hot: allLeads?.filter((l) => l.classification === "hot").length || 0,
			warm:
				allLeads?.filter((l) => l.classification === "warm").length || 0,
			cold:
				allLeads?.filter((l) => l.classification === "cold").length || 0,
			today:
				allLeads?.filter((l) => l.created_at >= todayStart).length || 0,
			avg_score:
				allLeads && allLeads.length > 0
					? Math.round(
							allLeads.reduce(
								(sum, l) => sum + (l.total_score || 0),
								0,
							) / allLeads.length,
						)
					: 0,
		};

		return NextResponse.json({ stats });
	} catch (error) {
		console.error("Lead stats error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
