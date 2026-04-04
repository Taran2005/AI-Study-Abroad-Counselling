import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/admin/outbound-stats
 *
 * Returns aggregate analytics for outbound calls:
 * - KPI metrics (total, answer rate, avg duration, interest rate)
 * - Outcome distribution (for pie chart)
 * - Daily volume (for bar chart, last 30 days)
 * - Recent calls (last 10, for mini-table)
 */
export async function GET() {
	try {
		// Fetch all outbound calls
		const { data: calls, error } = await supabase
			.from("outbound_calls")
			.select(
				"id, student_name, student_phone, call_type, call_status, call_outcome, duration_secs, initiated_at, extracted_data, created_at",
			);

		if (error) {
			console.error("[outbound-stats] Failed to fetch calls:", error);
			return NextResponse.json(
				{ error: "Failed to fetch outbound stats" },
				{ status: 500 },
			);
		}

		const allCalls = calls || [];
		const now = new Date();

		// ── KPI Metrics ──
		const totalOutboundCalls = allCalls.length;
		const completedCalls = allCalls.filter(
			(c) => c.call_status === "completed",
		);
		const answeredCalls = completedCalls.filter(
			(c) => c.call_outcome && c.call_outcome !== "no_answer",
		);
		const answerRate =
			totalOutboundCalls > 0
				? Math.round((answeredCalls.length / totalOutboundCalls) * 100)
				: 0;

		// Average duration (completed calls only)
		const durations = completedCalls
			.map((c) => c.duration_secs)
			.filter((d): d is number => d !== null && d > 0);
		const avgDuration =
			durations.length > 0
				? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
				: 0;

		// Interest rate
		const interestedCalls = completedCalls.filter(
			(c) => c.call_outcome === "interested",
		);
		const interestedRate =
			completedCalls.length > 0
				? Math.round(
						(interestedCalls.length / completedCalls.length) * 100,
					)
				: 0;

		// Consultations booked
		const consultationsBooked = completedCalls.filter((c) => {
			const ed = c.extracted_data as Record<string, unknown> | null;
			return ed && (ed.consultation_booked === "true" || ed.consultation_booked === true);
		}).length;

		// Today's calls
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).toISOString();
		const todayOutboundCalls = allCalls.filter(
			(c) => c.created_at >= todayStart,
		).length;

		// ── Outcome Distribution (for pie chart) ──
		const outcomeDistribution = {
			interested: 0,
			callback_requested: 0,
			not_interested: 0,
			voicemail: 0,
			no_answer: 0,
		};
		for (const call of completedCalls) {
			const outcome = call.call_outcome as keyof typeof outcomeDistribution;
			if (outcome && outcome in outcomeDistribution) {
				outcomeDistribution[outcome]++;
			}
		}

		// ── Daily Volume (last 30 days) ──
		const thirtyDaysAgo = new Date(
			now.getTime() - 30 * 24 * 60 * 60 * 1000,
		);
		const dailyCounts: Record<string, number> = {};

		for (let i = 0; i < 30; i++) {
			const date = new Date(
				thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000,
			);
			dailyCounts[date.toISOString().split("T")[0]] = 0;
		}

		for (const call of allCalls) {
			const date = new Date(call.created_at).toISOString().split("T")[0];
			if (dailyCounts[date] !== undefined) {
				dailyCounts[date]++;
			}
		}

		const dailyVolume = Object.entries(dailyCounts).map(
			([date, count]) => ({
				date,
				count,
			}),
		);

		// ── Recent Calls (last 10) ──
		const recentCalls = [...allCalls]
			.sort(
				(a, b) =>
					new Date(b.initiated_at).getTime() -
					new Date(a.initiated_at).getTime(),
			)
			.slice(0, 10)
			.map((c) => ({
				id: c.id,
				student_name: c.student_name,
				student_phone: c.student_phone,
				call_type: c.call_type,
				call_status: c.call_status,
				call_outcome: c.call_outcome,
				duration_secs: c.duration_secs,
				initiated_at: c.initiated_at,
			}));

		return NextResponse.json({
			stats: {
				totalOutboundCalls,
				completedCalls: completedCalls.length,
				answerRate,
				avgDuration,
				interestedRate,
				consultationsBooked,
				todayOutboundCalls,
			},
			outcomeDistribution,
			dailyVolume,
			recentCalls,
		});
	} catch (error) {
		console.error("[outbound-stats] Error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
