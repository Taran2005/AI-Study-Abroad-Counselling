"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/stat-card";
import PageHeader from "@/components/shared/page-header";
import {
	Phone,
	TrendingUp,
	Users,
	BarChart3,
} from "lucide-react";

export default function AdminAnalyticsPage() {
	// Placeholder data — will connect to aggregation API
	return (
		<div className="space-y-6">
			<PageHeader
				title="Analytics"
				description="Platform-wide performance metrics and insights"
			/>

			{/* KPI Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard icon={Phone} label="Total Calls" value={256} change={12} />
				<StatCard icon={TrendingUp} label="Avg. Score" value={64} suffix="/100" />
				<StatCard icon={Users} label="Total Students" value={189} change={8} />
				<StatCard
					icon={BarChart3}
					label="Conversion Rate"
					value={34}
					suffix="%"
					change={5}
				/>
			</div>

			{/* Charts placeholder */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Call Volume (Last 30 Days)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
							<div className="flex flex-col items-center gap-3">
								<BarChart3 className="w-10 h-10 text-muted-foreground/40" />
								<p>Chart will render with live data from Supabase</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-foreground">
							Language Distribution
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{[
								{ language: "English", pct: 55 },
								{ language: "Hinglish", pct: 28 },
								{ language: "Hindi", pct: 12 },
								{ language: "Marathi", pct: 5 },
							].map((lang) => (
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
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Questions */}
			<Card className="border-primary/10 bg-card/80">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold text-foreground">
						Frequently Asked Questions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[
							{ question: "What IELTS score do I need for UK universities?", count: 84 },
							{ question: "How much does it cost to study in Ireland?", count: 67 },
							{ question: "Can I work while studying in the UK?", count: 56 },
							{ question: "What scholarships are available for Indian students?", count: 45 },
							{ question: "What is the Graduate Route visa?", count: 38 },
						].map((q, i) => (
							<div
								key={i}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/40 transition-colors group"
							>
								<span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
									{i + 1}
								</span>
								<p className="text-sm text-foreground flex-1">
									{q.question}
								</p>
								<span className="text-xs text-muted-foreground font-medium">
									{q.count} times
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
