"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ScoreGauge from "@/components/shared/score-gauge";
import ScoreBar from "@/components/shared/score-bar";
import ClassificationBadge from "@/components/shared/classification-badge";
import PageHeader from "@/components/shared/page-header";
import {
	User,
	MapPin,
	GraduationCap,
	BookOpen,
	DollarSign,
	Calendar,
	Languages,
	Clock,
} from "lucide-react";
import type { LeadClassification, TranscriptEntry } from "@/lib/types/database";

interface ConversationDetail {
	id: string;
	room_name: string;
	started_at: string;
	ended_at: string | null;
	duration_secs: number | null;
	status: string;
	transcript: TranscriptEntry[];
	extracted_data: Record<string, unknown>;
	language: string;
}

interface LeadScoreDetail {
	id: string;
	intent_score: number;
	financial_score: number;
	timeline_score: number;
	total_score: number;
	classification: LeadClassification;
	recommended_actions: string[];
	notes: string | null;
}

export default function LeadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [conversation, setConversation] = useState<ConversationDetail | null>(null);
	const [leadScore, setLeadScore] = useState<LeadScoreDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchDetail() {
			try {
				// Fetch the lead score first to get the conversation_id
				const leadsRes = await fetch(`/api/leads?limit=50`);
				const leadsData = await leadsRes.json();
				const lead = leadsData.leads?.find(
					(l: { id: string }) => l.id === id,
				);

				if (lead) {
					setLeadScore(lead);
					// Fetch the full conversation
					const convoRes = await fetch(
						`/api/conversations/${lead.conversation_id}`,
					);
					const convoData = await convoRes.json();
					setConversation(convoData.conversation);
				}
			} catch (error) {
				console.error("Failed to fetch lead detail:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchDetail();
	}, [id]);

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<Skeleton className="h-96" />
					<Skeleton className="h-96" />
				</div>
			</div>
		);
	}

	const extracted = (conversation?.extracted_data || {}) as Record<
		string,
		string | boolean | string[]
	>;
	const profileFields = [
		{ icon: User, label: "Name", value: extracted.name },
		{ icon: MapPin, label: "Location", value: extracted.location },
		{
			icon: GraduationCap,
			label: "Education",
			value: extracted.education_level,
		},
		{ icon: BookOpen, label: "Field", value: extracted.field_of_study },
		{
			icon: BookOpen,
			label: "Institution",
			value: extracted.institution,
		},
		{
			icon: Languages,
			label: "Test Score",
			value: extracted.test_score
				? `${extracted.test_type || ""} ${extracted.test_score}`
				: undefined,
		},
		{
			icon: DollarSign,
			label: "Budget",
			value: extracted.budget_range,
		},
		{
			icon: Calendar,
			label: "Timeline",
			value: extracted.timeline,
		},
	];

	return (
		<div className="space-y-6">
			<PageHeader
				title={`Lead Detail`}
				description={conversation?.room_name || "Unknown session"}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Leads", href: "/dashboard/leads" },
					{ label: "Detail" },
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
				{/* Left Column: Score + Profile */}
				<div className="lg:col-span-2 space-y-4">
					{/* Score Card */}
					{leadScore && (
						<Card className="border-primary/10 bg-card/80">
							<CardContent className="flex flex-col items-center gap-6 py-6">
								<ScoreGauge score={leadScore.total_score} size={160} />
								<ClassificationBadge
									classification={leadScore.classification}
									size="lg"
								/>
								<Separator className="bg-border/60" />
								<div className="w-full space-y-4">
									<ScoreBar
										label="Intent Seriousness"
										score={leadScore.intent_score}
										weight="40%"
									/>
									<ScoreBar
										label="Financial Readiness"
										score={leadScore.financial_score}
										weight="30%"
									/>
									<ScoreBar
										label="Timeline Urgency"
										score={leadScore.timeline_score}
										weight="30%"
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Student Profile Card */}
					<Card className="border-primary/10 bg-card/80">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-semibold text-foreground">
								Extracted Profile
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{profileFields.map((field) => (
								<div
									key={field.label}
									className="flex items-center gap-3 group"
								>
									<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
										<field.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs text-muted-foreground">
											{field.label}
										</p>
										<p className="text-sm font-medium text-foreground truncate">
											{typeof field.value ===
											"string"
												? field.value
												: field.value
													? String(
															field.value,
														)
													: "—"}
										</p>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					{/* Recommended Actions */}
					{leadScore?.recommended_actions &&
						leadScore.recommended_actions.length > 0 && (
							<Card className="border-primary/10 bg-card/80">
								<CardHeader className="pb-3">
									<CardTitle className="text-base font-semibold text-foreground">
										Recommended Actions
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{leadScore.recommended_actions.map(
										(action, i) => (
											<div
												key={i}
												className="flex items-start gap-2 text-sm"
											>
												<span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
													{i + 1}
												</span>
												<span className="text-foreground">
													{action}
												</span>
											</div>
										),
									)}
								</CardContent>
							</Card>
						)}
				</div>

				{/* Right Column: Transcript */}
				<Card className="lg:col-span-3 border-primary/10 bg-card/80 flex flex-col">
					<CardHeader className="pb-3 shrink-0">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base font-semibold text-foreground">
								Conversation Transcript
							</CardTitle>
							<div className="flex items-center gap-2">
								<Clock className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									{conversation?.duration_secs
										? `${Math.floor(conversation.duration_secs / 60)}m ${conversation.duration_secs % 60}s`
										: "—"}
								</span>
								<Badge
									variant="outline"
									className="text-xs capitalize rounded-full border-border ml-2"
								>
									{conversation?.language || "en"}
								</Badge>
							</div>
						</div>
					</CardHeader>
					<ScrollArea className="flex-1 min-h-0 max-h-[600px]">
						<div className="px-6 pb-6 space-y-3">
							{conversation?.transcript &&
							conversation.transcript.length > 0 ? (
								conversation.transcript.map(
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
													? "Student"
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
									No transcript available for this
									conversation.
								</p>
							)}
						</div>
					</ScrollArea>
				</Card>
			</div>
		</div>
	);
}
