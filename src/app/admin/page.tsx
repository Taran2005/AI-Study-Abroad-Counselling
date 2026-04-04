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
	PhoneOutgoing,
	CheckCircle2,
	Target,
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

interface OutboundStats {
	totalOutboundCalls: number;
	completedCalls: number;
	answerRate: number;
	avgDuration: number;
	interestedRate: number;
	consultationsBooked: number;
	todayOutboundCalls: number;
}

interface OutcomeDistribution {
	interested: number;
	callback_requested: number;
	not_interested: number;
	voicemail: number;
	no_answer: number;
}

interface RecentOutboundCall {
	id: string;
	student_name: string | null;
	student_phone: string;
	call_type: string;
	call_status: string;
	call_outcome: string | null;
	duration_secs: number;
	initiated_at: string;
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

	// Outbound state
	const [outboundStats, setOutboundStats] = useState<OutboundStats | null>(
		null,
	);
	const [outcomeDist, setOutcomeDist] = useState<OutcomeDistribution | null>(
		null,
	);
	const [outboundVolume, setOutboundVolume] = useState<CallVolumeEntry[]>([]);
	const [recentOutbound, setRecentOutbound] = useState<RecentOutboundCall[]>(
		[],
	);

	useEffect(() => {
		async function fetchAnalytics() {
			try {
				const [inboundRes, outboundRes] = await Promise.all([
					fetch("/api/admin/stats"),
					fetch("/api/admin/outbound-stats"),
				]);

				const data = await inboundRes.json();
				setStats(data.stats);
				setCallVolume(data.callVolume || []);
				setLangDist(data.languageDistribution || []);
				setScoreDist(data.scoreDistribution || []);
				setClassification(
					data.classificationBreakdown || { hot: 0, warm: 0, cold: 0 },
				);

				if (outboundRes.ok) {
					const outData = await outboundRes.json();
					setOutboundStats(outData.stats || null);
					setOutcomeDist(outData.outcomeDistribution || null);
					setOutboundVolume(outData.dailyVolume || []);
					setRecentOutbound(outData.recentCalls || []);
				}
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

	const OUTCOME_COLORS = [
		"hsl(var(--primary))",
		"hsl(var(--chart-4))",
		"hsl(var(--chart-3))",
		"hsl(var(--chart-2))",
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

	// Prepare outcome pie data
	const outcomeData = outcomeDist
		? [
				{ name: "Interested", value: outcomeDist.interested },
				{ name: "Callback", value: outcomeDist.callback_requested },
				{ name: "Not Interested", value: outcomeDist.not_interested },
				{ name: "Voicemail", value: outcomeDist.voicemail },
				{ name: "No Answer", value: outcomeDist.no_answer },
			].filter((d) => d.value > 0)
		: [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Analytics"
				description="Platform-wide performance metrics and insights"
			/>

			{/* ═══════════════ INBOUND SECTION ═══════════════ */}

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

			{/* ═══════════════ OUTBOUND CALLS SECTION ═══════════════ */}

			<div className="pt-4">
				<h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
					<PhoneOutgoing className="w-5 h-5 text-primary" />
					Outbound Calls
				</h2>
				<p className="text-sm text-muted-foreground mb-4">
					Follow-up call performance via Bolna AI
				</p>
			</div>

			{/* Outbound KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={PhoneOutgoing}
					label="Total Outbound"
					value={outboundStats?.totalOutboundCalls || 0}
					change={outboundStats?.todayOutboundCalls || 0}
				/>
				<StatCard
					icon={CheckCircle2}
					label="Answer Rate"
					value={outboundStats?.answerRate || 0}
					suffix="%"
				/>
				<StatCard
					icon={Clock}
					label="Avg. Duration"
					value={formatDuration(outboundStats?.avgDuration || 0)}
				/>
				<StatCard
					icon={Target}
					label="Interest Rate"
					value={outboundStats?.interestedRate || 0}
					suffix="%"
				/>
			</div>

			{/* Outbound Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
				{/* Outbound Volume */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Outbound Volume (Last 30 Days)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64">
							{outboundVolume.some((d) => d.count > 0) ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={outboundVolume}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
										/>
										<XAxis
											dataKey="date"
											tick={{
												fontSize: 10,
												fill: "hsl(var(--muted-foreground))",
											}}
											tickFormatter={(val: string) => {
												const d = new Date(val);
												return `${d.getDate()}/${d.getMonth() + 1}`;
											}}
											interval={4}
										/>
										<YAxis
											tick={{
												fontSize: 11,
												fill: "hsl(var(--muted-foreground))",
											}}
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
											fill="hsl(var(--chart-4))"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
									No outbound call data yet
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Outcome Pie */}
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Call Outcomes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64 flex items-center">
							{outcomeData.length > 0 ? (
								<div className="flex items-center w-full gap-6">
									<div className="w-1/2">
										<ResponsiveContainer width="100%" height={200}>
											<PieChart>
												<Pie
													data={outcomeData}
													cx="50%"
													cy="50%"
													innerRadius={50}
													outerRadius={80}
													paddingAngle={3}
													dataKey="value"
												>
													{outcomeData.map((_, idx) => (
														<Cell
															key={idx}
															fill={OUTCOME_COLORS[idx % OUTCOME_COLORS.length]}
														/>
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
									<div className="space-y-2.5 w-1/2">
										{outcomeData.map((item, idx) => (
											<div key={item.name} className="flex items-center gap-2">
												<div
													className="w-3 h-3 rounded-full"
													style={{
														backgroundColor:
															OUTCOME_COLORS[idx % OUTCOME_COLORS.length],
													}}
												/>
												<span className="text-sm text-foreground font-medium flex-1">
													{item.name}
												</span>
												<span className="text-sm text-muted-foreground font-medium">
													{item.value}
												</span>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="w-full flex items-center justify-center text-muted-foreground text-sm">
									No outcome data yet
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent Outbound Calls Mini-Table */}
			{recentOutbound.length > 0 && (
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Recent Outbound Calls
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Student
										</th>
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Type
										</th>
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Status
										</th>
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Outcome
										</th>
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Duration
										</th>
										<th className="text-left py-2 px-3 font-medium text-muted-foreground">
											Date
										</th>
									</tr>
								</thead>
								<tbody>
									{recentOutbound.map((call) => (
										<tr
											key={call.id}
											className="border-b border-border/50 hover:bg-accent/30 transition-colors"
										>
											<td className="py-2.5 px-3 text-foreground font-medium">
												{call.student_name || call.student_phone}
											</td>
											<td className="py-2.5 px-3 text-muted-foreground capitalize">
												{call.call_type?.replace("_", " ")}
											</td>
											<td className="py-2.5 px-3">
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
														call.call_status === "completed"
															? "bg-primary/10 text-primary"
															: call.call_status === "queued"
																? "bg-chart-4/10 text-chart-4"
																: call.call_status === "failed"
																	? "bg-destructive/10 text-destructive"
																	: "bg-muted text-muted-foreground"
													}`}
												>
													{call.call_status}
												</span>
											</td>
											<td className="py-2.5 px-3">
												{call.call_outcome ? (
													<span
														className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
															call.call_outcome === "interested"
																? "bg-primary/10 text-primary"
																: call.call_outcome === "callback_requested"
																	? "bg-chart-4/10 text-chart-4"
																	: "bg-muted text-muted-foreground"
														}`}
													>
														{call.call_outcome.replace("_", " ")}
													</span>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td className="py-2.5 px-3 text-muted-foreground">
												{call.duration_secs
													? formatDuration(call.duration_secs)
													: "—"}
											</td>
											<td className="py-2.5 px-3 text-muted-foreground">
												{new Date(call.initiated_at).toLocaleDateString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
