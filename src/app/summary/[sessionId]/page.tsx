"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ScoreGauge from "@/components/shared/score-gauge";
import ClassificationBadge from "@/components/shared/classification-badge";
import {
	GraduationCap,
	User,
	MapPin,
	BookOpen,
	DollarSign,
	Calendar,
	Languages,
	CheckCircle2,
	ArrowRight,
	Clock,
	Share2,
	Phone,
} from "lucide-react";
import type { LeadClassification, TranscriptEntry } from "@/lib/types/database";

interface SessionData {
	conversation: {
		id: string;
		room_name: string;
		started_at: string;
		ended_at: string | null;
		duration_secs: number | null;
		status: string;
		transcript: TranscriptEntry[];
		extracted_data: Record<string, string | boolean | string[]>;
		language: string;
	} | null;
	lead_score: {
		total_score: number;
		classification: LeadClassification;
		intent_score: number;
		financial_score: number;
		timeline_score: number;
		recommended_actions: string[];
	} | null;
}

export default function SummaryPage({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = use(params);
	const [data, setData] = useState<SessionData | null>(null);
	const [loading, setLoading] = useState(true);
	const [visibleChips, setVisibleChips] = useState(0);

	useEffect(() => {
		async function fetchSession() {
			try {
				const res = await fetch(`/api/conversations/${sessionId}`);
				const result = await res.json();
				setData(result);
			} catch (error) {
				console.error("Failed to fetch session:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchSession();
	}, [sessionId]);

	// Animate data point chips appearing one by one
	useEffect(() => {
		if (!data?.conversation?.extracted_data) return;
		const entries = Object.entries(data.conversation.extracted_data);
		if (entries.length === 0) return;

		let count = 0;
		const timer = setInterval(() => {
			count++;
			setVisibleChips(count);
			if (count >= entries.length) clearInterval(timer);
		}, 150);

		return () => clearInterval(timer);
	}, [data]);

	if (loading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="max-w-5xl mx-auto p-6 space-y-6">
					<Skeleton className="h-12 w-64" />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Skeleton className="h-96" />
						<Skeleton className="h-96" />
					</div>
				</div>
			</div>
		);
	}

	const extracted = data?.conversation?.extracted_data || {};
	const extractedEntries = Object.entries(extracted).filter(
		([, v]) => v !== null && v !== undefined && v !== "",
	);

	const profileFields = [
		{ icon: User, label: "Name", key: "name" },
		{ icon: MapPin, label: "Location", key: "location" },
		{ icon: GraduationCap, label: "Education", key: "education_level" },
		{ icon: BookOpen, label: "Field of Study", key: "field_of_study" },
		{ icon: BookOpen, label: "Institution", key: "institution" },
		{ icon: Languages, label: "Test Score", key: "test_score" },
		{ icon: DollarSign, label: "Budget", key: "budget_range" },
		{ icon: Calendar, label: "Timeline", key: "timeline" },
	];

	return (
		<div className="min-h-screen bg-background">
			{/* Header banner */}
			<div className="relative bg-card border-b border-border overflow-hidden">
				<div className="absolute inset-0 bg-primary/5" />
				<div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
				<div className="relative max-w-5xl mx-auto px-6 py-12">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
									<GraduationCap className="w-5 h-5 text-primary-foreground" />
								</div>
								<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
									Session Summary
								</h1>
							</div>
							<p className="text-muted-foreground">
								{data?.conversation?.room_name ||
									"Your counselling session highlights"}
							</p>
							<div className="flex items-center gap-3 text-sm text-muted-foreground">
								<div className="flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5" />
									{data?.conversation?.duration_secs
										? `${Math.floor(data.conversation.duration_secs / 60)}m ${data.conversation.duration_secs % 60}s`
										: "—"}
								</div>
								<Badge
									variant="outline"
									className="text-xs capitalize rounded-full border-border"
								>
									{data?.conversation?.language || "en"}
								</Badge>
							</div>
						</div>
						<div className="flex gap-3">
							<Button
								variant="outline"
								className="rounded-full gap-2 border-primary/20 hover:bg-primary/5"
							>
								<Share2 className="w-4 h-4" />
								Share
							</Button>
							<Link href="/agent">
								<Button className="rounded-full gap-2">
									<Phone className="w-4 h-4" />
									New Session
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
					{/* Left: Score + Profile */}
					<div className="space-y-4">
						{/* Score */}
						{data?.lead_score && (
							<Card className="border-primary/10 bg-card/80">
								<CardContent className="flex flex-col items-center gap-4 py-6">
									<ScoreGauge
										score={data.lead_score.total_score}
										size={140}
									/>
									<ClassificationBadge
										classification={
											data.lead_score.classification
										}
										size="lg"
									/>
								</CardContent>
							</Card>
						)}

						{/* Extracted Data Points */}
						<Card className="border-primary/10 bg-card/80">
							<CardHeader className="pb-3">
								<CardTitle className="text-base font-semibold text-foreground">
									Data Gathered
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{profileFields.map((field, i) => {
									const value =
										extracted[
											field.key
										];
									const isVisible =
										i < visibleChips;
									return (
										<div
											key={field.key}
											className={`flex items-center gap-3 transition-all duration-500 ${
												isVisible
													? "opacity-100 translate-x-0"
													: "opacity-0 -translate-x-4"
											}`}
										>
											<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
												{value ? (
													<CheckCircle2 className="w-4 h-4 text-primary" />
												) : (
													<field.icon className="w-4 h-4 text-muted-foreground" />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-muted-foreground">
													{field.label}
												</p>
												<p className="text-sm font-medium text-foreground truncate">
													{typeof value ===
													"string"
														? value
														: value
															? String(
																	value,
																)
															: "Not provided"}
												</p>
											</div>
										</div>
									);
								})}
							</CardContent>
						</Card>
					</div>

					{/* Right: Transcript */}
					<Card className="lg:col-span-2 border-primary/10 bg-card/80 flex flex-col">
						<CardHeader className="pb-3 shrink-0">
							<CardTitle className="text-base font-semibold text-foreground">
								Conversation
							</CardTitle>
						</CardHeader>
						<ScrollArea className="flex-1 min-h-0 max-h-[600px]">
							<div className="px-6 pb-6 space-y-3">
								{data?.conversation?.transcript &&
								data.conversation.transcript.length > 0 ? (
									data.conversation.transcript.map(
										(entry, i) => (
											<div
												key={i}
												className={`flex flex-col gap-1 ${
													entry.role === "user"
														? "items-end"
														: "items-start"
												}`}
											>
												<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
													{entry.role === "user"
														? "You"
														: "StudyBuddyAI"}
												</span>
												<div
													className={`rounded-xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed ${
														entry.role ===
														"user"
															? "bg-primary text-primary-foreground"
															: "bg-secondary text-secondary-foreground"
													}`}
												>
													{entry.text}
												</div>
											</div>
										),
									)
								) : (
									<p className="text-sm text-muted-foreground text-center py-12">
										Transcript will appear when the
										session is saved.
									</p>
								)}
							</div>
						</ScrollArea>
					</Card>
				</div>

				{/* Next Steps */}
				{data?.lead_score?.recommended_actions &&
					data.lead_score.recommended_actions.length > 0 && (
						<Card className="border-primary/10 bg-card/80">
							<CardHeader className="pb-3">
								<CardTitle className="text-base font-semibold text-foreground">
									Recommended Next Steps
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{data.lead_score.recommended_actions.map(
										(action, i) => (
											<div
												key={i}
												className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-accent/40 transition-colors"
											>
												<span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
													{i + 1}
												</span>
												<p className="text-sm text-foreground">
													{action}
												</p>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>
					)}

				{/* CTA */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
					<Link href="/agent">
						<Button
							size="lg"
							className="rounded-full px-8 gap-2"
						>
							Start Another Session
							<ArrowRight className="w-4 h-4" />
						</Button>
					</Link>
					<Link href="/">
						<Button
							size="lg"
							variant="outline"
							className="rounded-full px-8 border-primary/20 hover:bg-primary/5"
						>
							Back to Home
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
