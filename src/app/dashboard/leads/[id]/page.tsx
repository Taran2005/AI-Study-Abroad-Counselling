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
	Phone,
	Mail,
	Globe,
	Target,
	Award,
	Sparkles,
	MessageSquare,
	TrendingUp,
	FileText,
	CheckCircle2,
} from "lucide-react";
import type { LeadClassification, TranscriptEntry, SentimentEntry } from "@/lib/types/database";

interface ConversationDetail {
	id: string;
	room_name: string;
	started_at: string;
	ended_at: string | null;
	duration_secs: number | null;
	status: string;
	transcript: TranscriptEntry[];
	sentiment_log: SentimentEntry[];
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

function getSentimentEmoji(sentiment: string) {
	const map: Record<string, string> = {
		excited: "🤩",
		positive: "😊",
		neutral: "😐",
		confused: "🤔",
		negative: "😟",
	};
	return map[sentiment] || "😐";
}

function getSentimentColor(sentiment: string) {
	const map: Record<string, string> = {
		excited: "bg-primary/10 text-primary border-primary/20",
		positive: "bg-chart-4/10 text-chart-4 border-chart-4/20",
		neutral: "bg-muted text-muted-foreground border-border",
		confused: "bg-chart-2/10 text-chart-2 border-chart-2/20",
		negative: "bg-destructive/10 text-destructive border-destructive/20",
	};
	return map[sentiment] || "bg-muted text-muted-foreground border-border";
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

	const studentName = typeof extracted.name === "string" ? extracted.name : "Unknown Student";

	// Split profile fields into sections
	const personalFields = [
		{ icon: User, label: "Full Name", value: extracted.name },
		{ icon: Phone, label: "Phone", value: extracted.phone },
		{ icon: Mail, label: "Email", value: extracted.email },
		{ icon: MapPin, label: "Location", value: extracted.location },
	];

	const academicFields = [
		{ icon: GraduationCap, label: "Education Level", value: extracted.education_level },
		{ icon: BookOpen, label: "Field of Study", value: extracted.field_of_study },
		{ icon: BookOpen, label: "Institution", value: extracted.institution },
		{ icon: TrendingUp, label: "GPA / Percentage", value: extracted.gpa },
	];

	const preferenceFields = [
		{
			icon: Globe,
			label: "Target Countries",
			value: Array.isArray(extracted.target_countries)
				? extracted.target_countries.join(", ")
				: extracted.target_countries,
		},
		{ icon: Target, label: "Course Interest", value: extracted.course_interest },
		{ icon: Calendar, label: "Preferred Intake", value: extracted.preferred_intake },
		{
			icon: Languages,
			label: "Test Score",
			value: extracted.test_score
				? `${extracted.test_type || ""} ${extracted.test_score}`.trim()
				: extracted.test_type
					? `${extracted.test_type} (score not shared)`
					: undefined,
		},
		{ icon: DollarSign, label: "Budget Range", value: extracted.budget_range },
		{
			icon: Award,
			label: "Scholarship Interest",
			value:
				extracted.scholarship_interest === true
					? "Yes"
					: extracted.scholarship_interest === false
						? "No"
						: undefined,
		},
		{ icon: Clock, label: "Timeline", value: extracted.timeline },
	];

	function renderProfileSection(
		sectionTitle: string,
		fields: { icon: typeof User; label: string; value: unknown }[],
	) {
		const hasAnyValue = fields.some(
			(f) => f.value !== undefined && f.value !== null && f.value !== "",
		);
		if (!hasAnyValue) return null;

		return (
			<div className="space-y-1">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
					{sectionTitle}
				</p>
				{fields.map((field) => (
					<div
						key={field.label}
						className="flex items-center gap-3 group py-1.5 px-1 rounded-lg hover:bg-accent/30 transition-colors"
					>
						<div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
							<field.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[11px] text-muted-foreground leading-none mb-0.5">
								{field.label}
							</p>
							<p className="text-sm font-medium text-foreground truncate">
								{typeof field.value === "string"
									? field.value
									: field.value !== undefined &&
										  field.value !== null
										? String(field.value)
										: "—"}
							</p>
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={studentName}
				description={conversation?.room_name || "Unknown session"}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Leads", href: "/dashboard/leads" },
					{ label: studentName },
				]}
				actions={
					<div className="flex items-center gap-2">
						{conversation?.status && (
							<Badge
								variant="outline"
								className={`text-xs capitalize rounded-full ${
									conversation.status === "completed"
										? "border-primary/25 text-primary"
										: conversation.status === "live"
											? "border-chart-1/25 text-chart-1"
											: "border-border text-muted-foreground"
								}`}
							>
								{conversation.status}
							</Badge>
						)}
						{conversation?.language && (
							<Badge
								variant="outline"
								className="text-xs rounded-full border-border text-muted-foreground"
							>
								{conversation.language === "hi" ? "Hindi" : "English"}
							</Badge>
						)}
					</div>
				}
			/>

			{/* Call Metadata Row */}
			{conversation && (
				<div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<Calendar className="w-3.5 h-3.5" />
						<span>
							{new Date(conversation.started_at).toLocaleDateString("en-IN", {
								year: "numeric",
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</div>
					{conversation.duration_secs && (
						<div className="flex items-center gap-1.5">
							<Clock className="w-3.5 h-3.5" />
							<span>
								{Math.floor(conversation.duration_secs / 60)}m{" "}
								{conversation.duration_secs % 60}s
							</span>
						</div>
					)}
					{conversation.transcript && (
						<div className="flex items-center gap-1.5">
							<MessageSquare className="w-3.5 h-3.5" />
							<span>{conversation.transcript.length} turns</span>
						</div>
					)}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
				{/* Left Column: Score + Profile + Actions + Sentiment */}
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

					{/* Extracted Profile Card */}
					<Card className="border-primary/10 bg-card/80">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
								<FileText className="w-4 h-4 text-primary" />
								Extracted Profile
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							{renderProfileSection("Personal", personalFields)}
							{renderProfileSection("Academic", academicFields)}
							{renderProfileSection("Preferences & Goals", preferenceFields)}
						</CardContent>
					</Card>

					{/* Recommended Actions */}
					{leadScore?.recommended_actions &&
						leadScore.recommended_actions.length > 0 && (
							<Card className="border-primary/10 bg-card/80">
								<CardHeader className="pb-3">
									<CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-primary" />
										Recommended Actions
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{leadScore.recommended_actions.map(
										(action, i) => (
											<div
												key={i}
												className="flex items-start gap-2.5 text-sm p-2 rounded-lg hover:bg-accent/30 transition-colors"
											>
												<span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
													{i + 1}
												</span>
												<span className="text-foreground leading-relaxed">
													{action}
												</span>
											</div>
										),
									)}
								</CardContent>
							</Card>
						)}

					{/* Counsellor Notes */}
					{leadScore?.notes && (
						<Card className="border-primary/10 bg-card/80">
							<CardHeader className="pb-3">
								<CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
									<Sparkles className="w-4 h-4 text-primary" />
									AI Summary
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-foreground leading-relaxed">
									{leadScore.notes}
								</p>
							</CardContent>
						</Card>
					)}

					{/* Sentiment Analysis */}
					{conversation?.sentiment_log &&
						conversation.sentiment_log.length > 0 && (
							<Card className="border-primary/10 bg-card/80">
								<CardHeader className="pb-3">
									<CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-primary" />
										Sentiment Timeline
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-1.5">
										{conversation.sentiment_log.map(
											(entry, i) => (
												<Badge
													key={i}
													variant="outline"
													className={`text-[10px] rounded-full px-2 py-0.5 gap-1 capitalize ${getSentimentColor(entry.sentiment)}`}
												>
													{getSentimentEmoji(entry.sentiment)}
													{entry.sentiment}
												</Badge>
											),
										)}
									</div>
								</CardContent>
							</Card>
						)}
				</div>

				{/* Right Column: Transcript */}
				<Card className="lg:col-span-3 border-primary/10 bg-card/80 flex flex-col">
					<CardHeader className="pb-3 shrink-0">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
								<MessageSquare className="w-4 h-4 text-primary" />
								Conversation Transcript
							</CardTitle>
							<div className="flex items-center gap-2">
								{conversation?.duration_secs && (
									<div className="flex items-center gap-1.5">
										<Clock className="w-3.5 h-3.5 text-muted-foreground" />
										<span className="text-xs text-muted-foreground">
											{Math.floor(conversation.duration_secs / 60)}m{" "}
											{conversation.duration_secs % 60}s
										</span>
									</div>
								)}
							</div>
						</div>
					</CardHeader>
					<ScrollArea className="flex-1 min-h-0 max-h-[700px]">
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
											<div className="flex items-center gap-1.5">
												<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
													{entry.role === "user"
														? "Student"
														: "StudyBuddyAI"}
												</span>
												{entry.timestamp && (
													<span className="text-[10px] text-muted-foreground/60">
														{new Date(entry.timestamp).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</span>
												)}
											</div>
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
