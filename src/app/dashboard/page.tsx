"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/shared/stat-card";
import ClassificationBadge from "@/components/shared/classification-badge";
import PageHeader from "@/components/shared/page-header";
import { Users, Flame, Sun, Snowflake, TrendingUp } from "lucide-react";
import type { LeadClassification } from "@/lib/types/database";

interface LeadStats {
	total: number;
	hot: number;
	warm: number;
	cold: number;
	today: number;
	avg_score: number;
}

interface RecentConversation {
	id: string;
	room_name: string;
	started_at: string;
	status: string;
	language: string;
}

export default function DashboardOverview() {
	const [stats, setStats] = useState<LeadStats | null>(null);
	const [recentConversations, setRecentConversations] = useState<
		RecentConversation[]
	>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchData() {
			try {
				const [statsRes, convosRes] = await Promise.all([
					fetch("/api/leads/stats"),
					fetch("/api/conversations?limit=5"),
				]);
				const statsData = await statsRes.json();
				const convosData = await convosRes.json();
				setStats(statsData.stats);
				setRecentConversations(convosData.conversations || []);
			} catch (error) {
				console.error("Failed to fetch dashboard data:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader title="Dashboard" description="Welcome back, Counsellor" />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-64 rounded-xl" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				description="Welcome back, Counsellor"
			/>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={Users}
					label="Total Leads"
					value={stats?.total || 0}
				/>
				<StatCard
					icon={Flame}
					label="Hot Leads"
					value={stats?.hot || 0}
					suffix=""
				/>
				<StatCard
					icon={Sun}
					label="Warm Leads"
					value={stats?.warm || 0}
				/>
				<StatCard
					icon={TrendingUp}
					label="Avg. Score"
					value={stats?.avg_score || 0}
					suffix="/100"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
				{/* Classification Breakdown */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Lead Distribution
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{(["hot", "warm", "cold"] as LeadClassification[]).map(
							(cls) => {
								const count =
									stats?.[cls] || 0;
								const total = stats?.total || 1;
								const pct = Math.round(
									(count / total) * 100,
								);
								return (
									<div
										key={cls}
										className="flex items-center gap-3"
									>
										<ClassificationBadge
											classification={cls}
											size="sm"
										/>
										<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
											<div
												className={`h-full rounded-full transition-all duration-1000 ease-out ${
													cls === "hot"
														? "bg-primary"
														: cls === "warm"
															? "bg-chart-4"
															: "bg-muted-foreground/40"
												}`}
												style={{
													width: `${pct}%`,
												}}
											/>
										</div>
										<span className="text-sm font-medium text-foreground w-10 text-right">
											{count}
										</span>
									</div>
								);
							},
						)}
					</CardContent>
				</Card>

				{/* Recent Activity */}
				<Card className="lg:col-span-2 border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Recent Conversations
						</CardTitle>
					</CardHeader>
					<CardContent>
						{recentConversations.length === 0 ? (
							<p className="text-sm text-muted-foreground py-8 text-center">
								No conversations yet. Students will appear here
								after their first call.
							</p>
						) : (
							<div className="space-y-3">
								{recentConversations.map((convo, i) => (
									<Link
										key={convo.id}
										href={`/dashboard/leads`}
										className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 group"
										style={{
											animationDelay: `${i * 100}ms`,
										}}
									>
										<div className="w-2 h-2 rounded-full shrink-0">
											<div
												className={`w-2 h-2 rounded-full ${
													convo.status === "live"
														? "bg-primary animate-pulse"
														: convo.status ===
															  "completed"
															? "bg-chart-4"
															: "bg-muted-foreground/40"
												}`}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-foreground truncate">
												{convo.room_name ||
													"Unknown Room"}
											</p>
											<p className="text-xs text-muted-foreground">
												{new Date(
													convo.started_at,
												).toLocaleString()}
											</p>
										</div>
										<Badge
											variant="outline"
											className="text-xs capitalize rounded-full border-border"
										>
											{convo.status}
										</Badge>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Today's summary */}
			<Card className="border-primary/10 bg-card/80">
				<CardContent className="flex items-center gap-4 py-5 px-5">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
						<Snowflake className="w-5 h-5 text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-foreground">
							Today&apos;s Activity
						</p>
						<p className="text-xs text-muted-foreground">
							{stats?.today || 0} new leads today •{" "}
							{stats?.hot || 0} hot leads requiring follow-up
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
