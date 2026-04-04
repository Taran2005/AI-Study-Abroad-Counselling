"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/shared/stat-card";
import PageHeader from "@/components/shared/page-header";
import {
	Phone,
	TrendingUp,
	Users,
	BarChart3,
	Clock,
	Radio,
	Flame,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";

interface AdminStats {
	totalCalls: number;
	liveCalls: number;
	completedCalls: number;
	totalStudents: number;
	avgDuration: number;
	avgScore: number;
	conversionRate: number;
	hotLeads: number;
	todayCalls: number;
	todayLeads: number;
}

interface CallVolumeEntry {
	date: string;
	count: number;
}

interface LanguageEntry {
	language: string;
	count: number;
	pct: number;
}

interface ScoreBucket {
	label: string;
	count: number;
}

export default function AdminAnalyticsPage() {
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [callVolume, setCallVolume] = useState<CallVolumeEntry[]>([]);
	const [langDist, setLangDist] = useState<LanguageEntry[]>([]);
	const [scoreDist, setScoreDist] = useState<ScoreBucket[]>([]);
	const [classification, setClassification] = useState({
		hot: 0,
		warm: 0,
		cold: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchAnalytics() {
			try {
				const res = await fetch("/api/admin/stats");
				const data = await res.json();
				setStats(data.stats);
				setCallVolume(data.callVolume || []);
				setLangDist(data.languageDistribution || []);
				setScoreDist(data.scoreDistribution || []);
				setClassification(
					data.classificationBreakdown || { hot: 0, warm: 0, cold: 0 },
				);
			} catch (error) {
				console.error("Failed to fetch admin analytics:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchAnalytics();
	}, []);

	function formatDuration(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	const PIE_COLORS = [
		"hsl(var(--primary))",
		"hsl(var(--chart-4))",
		"hsl(var(--muted-foreground) / 0.4)",
	];

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader title="Analytics" />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Skeleton className="h-72 rounded-xl" />
					<Skeleton className="h-72 rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Analytics"
				description="Platform-wide performance metrics and insights"
			/>

			{/* KPI Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={Phone}
					label="Total Calls"
					value={stats?.totalCalls || 0}
					change={stats?.todayCalls || 0}
				/>
				<StatCard
					icon={TrendingUp}
					label="Avg. Score"
					value={stats?.avgScore || 0}
					suffix="/100"
				/>
				<StatCard
					icon={Users}
					label="Total Students"
					value={stats?.totalStudents || 0}
				/>
				<StatCard
					icon={Flame}
					label="Conversion Rate"
					value={stats?.conversionRate || 0}
					suffix="%"
				/>
			</div>

			{/* Secondary row */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<StatCard
					icon={Radio}
					label="Live Now"
					value={stats?.liveCalls || 0}
				/>
				<StatCard
					icon={Clock}
					label="Avg. Duration"
					value={formatDuration(stats?.avgDuration || 0)}
				/>
				<StatCard
					icon={BarChart3}
					label="Hot Leads"
					value={stats?.hotLeads || 0}
				/>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
				{/* Call Volume Bar Chart */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Call Volume (Last 30 Days)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64">
							{callVolume.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={callVolume}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
										/>
										<XAxis
											dataKey="date"
											tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
											tickFormatter={(val: string) => {
												const d = new Date(val);
												return `${d.getDate()}/${d.getMonth() + 1}`;
											}}
											interval={4}
										/>
										<YAxis
											tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
											allowDecimals={false}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--popover))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "8px",
												color: "hsl(var(--foreground))",
												fontSize: "12px",
											}}
											labelFormatter={(val: unknown) =>
												new Date(String(val)).toLocaleDateString()
											}
										/>
										<Bar
											dataKey="count"
											fill="hsl(var(--primary))"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
									No call data to display
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Lead Classification Pie */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Lead Classification
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64 flex items-center">
							{classification.hot + classification.warm + classification.cold >
							0 ? (
								<div className="flex items-center w-full gap-6">
									<div className="w-1/2">
										<ResponsiveContainer width="100%" height={200}>
											<PieChart>
												<Pie
													data={[
														{ name: "Hot", value: classification.hot },
														{ name: "Warm", value: classification.warm },
														{ name: "Cold", value: classification.cold },
													]}
													cx="50%"
													cy="50%"
													innerRadius={50}
													outerRadius={80}
													paddingAngle={3}
													dataKey="value"
												>
													{PIE_COLORS.map((color, idx) => (
														<Cell key={idx} fill={color} />
													))}
												</Pie>
												<Tooltip
													contentStyle={{
														backgroundColor: "hsl(var(--popover))",
														border: "1px solid hsl(var(--border))",
														borderRadius: "8px",
														color: "hsl(var(--foreground))",
														fontSize: "12px",
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-3 w-1/2">
										{[
											{ label: "Hot", count: classification.hot, color: PIE_COLORS[0] },
											{ label: "Warm", count: classification.warm, color: PIE_COLORS[1] },
											{ label: "Cold", count: classification.cold, color: PIE_COLORS[2] },
										].map((item) => (
											<div key={item.label} className="flex items-center gap-2">
												<div
													className="w-3 h-3 rounded-full"
													style={{ backgroundColor: item.color }}
												/>
												<span className="text-sm text-foreground font-medium flex-1">
													{item.label}
												</span>
												<span className="text-sm text-muted-foreground font-medium">
													{item.count}
												</span>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="w-full flex items-center justify-center text-muted-foreground text-sm">
									No lead data to display
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Language + Score Distribution Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
				{/* Language Distribution */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Language Distribution
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{langDist.length > 0 ? (
								langDist.map((lang) => (
									<div key={lang.language} className="space-y-1.5">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-foreground">
												{lang.language}
											</span>
											<span className="text-sm text-muted-foreground">
												{lang.pct}%
											</span>
										</div>
										<div className="h-2 rounded-full bg-muted overflow-hidden">
											<div
												className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
												style={{ width: `${lang.pct}%` }}
											/>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground py-8 text-center">
									No language data to display
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Score Distribution */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Score Distribution
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-52">
							{scoreDist.some((b) => b.count > 0) ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={scoreDist}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
										/>
										<XAxis
											dataKey="label"
											tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
										/>
										<YAxis
											tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
											allowDecimals={false}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--popover))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "8px",
												color: "hsl(var(--foreground))",
												fontSize: "12px",
											}}
										/>
										<Bar
											dataKey="count"
											fill="hsl(var(--chart-4))"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
									No score data to display
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
