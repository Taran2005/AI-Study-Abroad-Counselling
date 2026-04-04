import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/admin/stats
 *
 * Returns comprehensive analytics for the admin dashboard:
 * - Total calls, students, avg duration, conversion rate
 * - Call volume over the last 30 days (daily counts)
 * - Language distribution
 * - Lead classification breakdown
 * - Score distribution
 */
export async function GET() {
	try {
		// Fetch all conversations
		const { data: conversations, error: convError } = await supabase
			.from("conversations")
			.select("id, started_at, ended_at, duration_secs, status, language, created_at");

		if (convError) {
			console.error("Failed to fetch conversations:", convError);
			return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
		}

		// Fetch all lead scores
		const { data: leads, error: leadsError } = await supabase
			.from("lead_scores")
			.select("intent_score, financial_score, timeline_score, total_score, classification, created_at");

		if (leadsError) {
			console.error("Failed to fetch leads:", leadsError);
			return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
		}

		// Fetch student count
		const { count: studentCount, error: studentsError } = await supabase
			.from("student_profiles")
			.select("id", { count: "exact", head: true });

		if (studentsError) {
			console.error("Failed to count students:", studentsError);
		}

		const allConvos = conversations || [];
		const allLeads = leads || [];
		const now = new Date();

		// ── KPI Metrics ──
		const totalCalls = allConvos.length;
		const completedCalls = allConvos.filter((c) => c.status === "completed");
		const liveCalls = allConvos.filter((c) => c.status === "live").length;
		const totalStudents = studentCount || 0;

		// Average call duration (completed calls only)
		const durations = completedCalls
			.map((c) => c.duration_secs)
			.filter((d): d is number => d !== null && d > 0);
		const avgDuration = durations.length > 0
			? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
			: 0;

		// Average lead score
		const avgScore = allLeads.length > 0
			? Math.round(allLeads.reduce((sum, l) => sum + (l.total_score || 0), 0) / allLeads.length)
			: 0;

		// Conversion rate = hot leads / total leads × 100
		const hotLeads = allLeads.filter((l) => l.classification === "hot").length;
		const conversionRate = allLeads.length > 0
			? Math.round((hotLeads / allLeads.length) * 100)
			: 0;

		// ── Call Volume (Last 30 Days) ──
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const dailyCounts: Record<string, number> = {};

		// Initialize all 30 days with 0
		for (let i = 0; i < 30; i++) {
			const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
			const key = date.toISOString().split("T")[0];
			dailyCounts[key] = 0;
		}

		// Count conversations per day
		for (const convo of allConvos) {
			const date = new Date(convo.created_at).toISOString().split("T")[0];
			if (dailyCounts[date] !== undefined) {
				dailyCounts[date]++;
			}
		}

		const callVolume = Object.entries(dailyCounts).map(([date, count]) => ({
			date,
			count,
		}));

		// ── Language Distribution ──
		const langCounts: Record<string, number> = {};
		for (const convo of allConvos) {
			const lang = convo.language || "en";
			langCounts[lang] = (langCounts[lang] || 0) + 1;
		}

		const languageMap: Record<string, string> = {
			en: "English",
			hi: "Hindi",
			hinglish: "Hinglish",
			mr: "Marathi",
		};

		const languageDistribution = Object.entries(langCounts)
			.map(([code, count]) => ({
				language: languageMap[code] || code.toUpperCase(),
				count,
				pct: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
			}))
			.sort((a, b) => b.count - a.count);

		// ── Lead Classification Breakdown ──
		const classificationBreakdown = {
			hot: allLeads.filter((l) => l.classification === "hot").length,
			warm: allLeads.filter((l) => l.classification === "warm").length,
			cold: allLeads.filter((l) => l.classification === "cold").length,
		};

		// ── Score Distribution (bucketed) ──
		const scoreBuckets = [
			{ label: "0-20", min: 0, max: 20, count: 0 },
			{ label: "21-40", min: 21, max: 40, count: 0 },
			{ label: "41-60", min: 41, max: 60, count: 0 },
			{ label: "61-80", min: 61, max: 80, count: 0 },
			{ label: "81-100", min: 81, max: 100, count: 0 },
		];

		for (const lead of allLeads) {
			const score = lead.total_score || 0;
			const bucket = scoreBuckets.find((b) => score >= b.min && score <= b.max);
			if (bucket) bucket.count++;
		}

		// ── Today's Stats ──
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
		const todayCalls = allConvos.filter((c) => c.created_at >= todayStart).length;
		const todayLeads = allLeads.filter((l) => l.created_at >= todayStart).length;

		return NextResponse.json({
			stats: {
				totalCalls,
				liveCalls,
				completedCalls: completedCalls.length,
				totalStudents,
				avgDuration,
				avgScore,
				conversionRate,
				hotLeads,
				todayCalls,
				todayLeads,
			},
			callVolume,
			languageDistribution,
			classificationBreakdown,
			scoreDistribution: scoreBuckets,
		});
	} catch (error) {
		console.error("Admin stats error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
