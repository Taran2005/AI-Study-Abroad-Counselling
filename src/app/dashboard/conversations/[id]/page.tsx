"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import {
	ArrowLeft,
	Clock,
	Mic,
	Bot,
	User,
	Smile,
	Frown,
	Meh,
	HelpCircle,
	Sparkles,
	MapPin,
	GraduationCap,
	Phone,
	Mail,
	DollarSign,
	Calendar,
	Target,
	BookOpen,
	Globe,
	Award,
	TrendingUp,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

/* ---------- Types ---------- */
interface TranscriptEntry {
	role: "user" | "assistant";
	text: string;
	ts: string;
}

interface SentimentEntry {
	turn: number;
	sentiment: string;
	confidence: number;
}

interface ConversationDetail {
	id: string;
	room_name: string;
	started_at: string;
	ended_at: string | null;
	status: string;
	language: string;
	transcript: TranscriptEntry[];
	extracted_data: Record<string, unknown>;
	sentiment_log: SentimentEntry[];
	duration_secs: number | null;
}

/* ---------- Sentiment helpers ---------- */
const MOOD_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
	excited: { icon: Sparkles, label: "Excited", color: "text-yellow-400" },
	positive: { icon: Smile, label: "Positive", color: "text-green-400" },
	neutral: { icon: Meh, label: "Neutral", color: "text-muted-foreground" },
	confused: { icon: HelpCircle, label: "Confused", color: "text-orange-400" },
	negative: { icon: Frown, label: "Negative", color: "text-red-400" },
};

function getLatestMood(sentimentLog: SentimentEntry[]) {
	if (!sentimentLog || sentimentLog.length === 0)
		return { icon: Meh, label: "Neutral", color: "text-muted-foreground" };
	const latest = sentimentLog[sentimentLog.length - 1];
	return MOOD_CONFIG[latest.sentiment] || MOOD_CONFIG.neutral;
}

/* ---------- Extracted data field config ---------- */
const PROFILE_FIELDS: { key: string; label: string; icon: React.ElementType }[] = [
	{ key: "name", label: "Name", icon: User },
	{ key: "phone", label: "Phone", icon: Phone },
	{ key: "email", label: "Email", icon: Mail },
	{ key: "location", label: "Location", icon: MapPin },
	{ key: "education_level", label: "Education", icon: GraduationCap },
	{ key: "field_of_study", label: "Field", icon: BookOpen },
	{ key: "institution", label: "Institution", icon: Award },
	{ key: "gpa", label: "GPA / %", icon: TrendingUp },
	{ key: "target_countries", label: "Countries", icon: Globe },
	{ key: "course_interest", label: "Course", icon: Target },
	{ key: "test_type", label: "Test Type", icon: BookOpen },
	{ key: "test_score", label: "Score", icon: Award },
	{ key: "budget_range", label: "Budget", icon: DollarSign },
	{ key: "timeline", label: "Timeline", icon: Calendar },
];

/* ---------- Component ---------- */
export default function ConversationDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const [conversation, setConversation] = useState<ConversationDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const transcriptEndRef = useRef<HTMLDivElement>(null);

	// Fetch full conversation data
	const fetchConversation = useCallback(async () => {
		try {
			const res = await fetch(`/api/conversations/${id}`);
			const data = await res.json();
			setConversation(data.conversation || null);
		} catch (error) {
			console.error("Failed to fetch conversation:", error);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetchConversation();

		// Realtime: use UPDATE events as a signal to re-fetch
		const channel = supabaseBrowser
			.channel(`conversation-${id}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "conversations",
					filter: `id=eq.${id}`,
				},
				() => {
					// Re-fetch full row since Realtime doesn't include JSONB columns
					fetchConversation();
				},
			)
			.subscribe();

		return () => {
			supabaseBrowser.removeChannel(channel);
		};
	}, [id, fetchConversation]);

	// Polling: re-fetch every 3 seconds while conversation is live
	useEffect(() => {
		if (!conversation || conversation.status !== "live") return;
		const interval = setInterval(() => {
			fetchConversation();
		}, 3000);
		return () => clearInterval(interval);
	}, [conversation?.status, fetchConversation]);

	// Auto-scroll transcript
	useEffect(() => {
		transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [conversation?.transcript]);

	// Elapsed time ticker
	const [, setTick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(timer);
	}, []);

	function getElapsedTime(startedAt: string) {
		const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
		const m = Math.floor(elapsed / 60);
		const s = elapsed % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	function formatTime(ts: string) {
		return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-48" />
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Skeleton className="h-[500px] lg:col-span-2 rounded-xl" />
					<Skeleton className="h-[500px] rounded-xl" />
				</div>
			</div>
		);
	}

	if (!conversation) {
		return (
			<div className="space-y-6">
				<PageHeader title="Conversation Not Found" />
				<p className="text-muted-foreground">This conversation does not exist or has been deleted.</p>
				<Button variant="outline" onClick={() => router.push("/dashboard/conversations")}>
					<ArrowLeft className="w-4 h-4 mr-2" /> Back to Conversations
				</Button>
			</div>
		);
	}

	const isLive = conversation.status === "live";
	const mood = getLatestMood(conversation.sentiment_log || []);
	const MoodIcon = mood.icon;

	const extractedData = conversation.extracted_data || {};
	const filledFields = PROFILE_FIELDS.filter((f) => {
		const val = extractedData[f.key];
		return val !== null && val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0);
	});
	const emptyFields = PROFILE_FIELDS.filter((f) => !filledFields.includes(f));

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title={conversation.room_name || "Session"}
				description={
					isLive
						? `Live session • ${getElapsedTime(conversation.started_at)} elapsed`
						: `Completed • ${conversation.duration_secs ? `${Math.floor(conversation.duration_secs / 60)}m ${conversation.duration_secs % 60}s` : "N/A"}`
				}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Live Calls", href: "/dashboard/conversations" },
					{ label: isLive ? "Live Session" : "Session Detail" },
				]}
				actions={
					<div className="flex items-center gap-3">
						{isLive && (
							<Badge variant="outline" className="gap-1.5 rounded-full border-primary/25 text-primary animate-pulse">
								<span className="w-2 h-2 rounded-full bg-primary" />
								Live
							</Badge>
						)}
						{!isLive && (
							<Badge variant="outline" className="gap-1.5 rounded-full border-muted-foreground/25 text-muted-foreground">
								Ended
							</Badge>
						)}
						<Link href="/dashboard/conversations">
							<Button variant="outline" size="sm">
								<ArrowLeft className="w-4 h-4 mr-2" /> Back
							</Button>
						</Link>
					</div>
				}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* ── LEFT: Transcript Panel ── */}
				<Card className="lg:col-span-2 border-border/40 bg-card/80">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-semibold flex items-center gap-2">
								<Mic className="w-5 h-5 text-primary" />
								Live Transcript
							</CardTitle>
							<Badge variant="outline" className="text-xs rounded-full">
								{(conversation.transcript || []).length} messages
							</Badge>
						</div>
					</CardHeader>
					<Separator className="bg-border/40" />
					<CardContent className="pt-4">
						<div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scroll-smooth">
							{(!conversation.transcript || conversation.transcript.length === 0) ? (
								<p className="text-sm text-muted-foreground text-center py-10">
									{isLive
										? "Waiting for conversation to start..."
										: "No transcript available for this session."}
								</p>
							) : (
								conversation.transcript.map((entry, i) => (
									<div
										key={i}
										className={`flex gap-3 ${entry.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
									>
										<div
											className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
												entry.role === "assistant"
													? "bg-primary/10"
													: "bg-accent"
											}`}
										>
											{entry.role === "assistant" ? (
												<Bot className="w-3.5 h-3.5 text-primary" />
											) : (
												<User className="w-3.5 h-3.5 text-foreground" />
											)}
										</div>
										<div
											className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
												entry.role === "assistant"
													? "bg-primary/5 border border-primary/10 text-foreground"
													: "bg-accent text-foreground"
											}`}
										>
											<p className="leading-relaxed">{entry.text}</p>
											{entry.ts && (
												<p className="text-[10px] text-muted-foreground mt-1 text-right">
													{formatTime(entry.ts)}
												</p>
											)}
										</div>
									</div>
								))
							)}
							<div ref={transcriptEndRef} />
						</div>
					</CardContent>
				</Card>

				{/* ── RIGHT: Sidebar ── */}
				<div className="space-y-6">
					{/* Live Mood Indicator */}
					<Card className="border-border/40 bg-card/80">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-primary" />
								Student Mood
							</CardTitle>
						</CardHeader>
						<Separator className="bg-border/40" />
						<CardContent className="pt-4">
							<div className="flex items-center gap-4">
								<div className={`w-14 h-14 rounded-xl bg-card border border-border/50 flex items-center justify-center ${mood.color}`}>
									<MoodIcon className="w-7 h-7" />
								</div>
								<div>
									<p className={`text-lg font-bold ${mood.color}`}>{mood.label}</p>
									<p className="text-xs text-muted-foreground">
										{isLive ? "Updating live..." : "Final mood at end of call"}
									</p>
								</div>
							</div>

							{/* Sentiment timeline mini-chart */}
							{conversation.sentiment_log && conversation.sentiment_log.length > 1 && (
								<div className="mt-4 flex items-end gap-1 h-10">
									{conversation.sentiment_log.map((entry, i) => {
										const moodConf = MOOD_CONFIG[entry.sentiment] || MOOD_CONFIG.neutral;
										const heights: Record<string, string> = {
											excited: "100%",
											positive: "75%",
											neutral: "50%",
											confused: "35%",
											negative: "20%",
										};
										return (
											<div
												key={i}
												className={`flex-1 rounded-t-sm ${moodConf.color.replace("text-", "bg-")}/40`}
												style={{ height: heights[entry.sentiment] || "50%" }}
												title={`Turn ${entry.turn}: ${entry.sentiment}`}
											/>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Extracted Student Profile */}
					<Card className="border-border/40 bg-card/80">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<GraduationCap className="w-4 h-4 text-primary" />
									Student Profile
								</CardTitle>
								<Badge variant="outline" className="text-[10px] rounded-full">
									{filledFields.length}/{PROFILE_FIELDS.length}
								</Badge>
							</div>
						</CardHeader>
						<Separator className="bg-border/40" />
						<CardContent className="pt-4">
							<div className="space-y-2.5">
								{filledFields.map((field) => {
									const val = extractedData[field.key];
									const Icon = field.icon;
									const displayVal = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
									return (
										<div key={field.key} className="flex items-start gap-2.5">
											<Icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
											<div className="min-w-0">
												<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
													{field.label}
												</p>
												<p className="text-sm text-foreground truncate">{displayVal}</p>
											</div>
										</div>
									);
								})}
								{emptyFields.length > 0 && (
									<>
										<Separator className="bg-border/20 my-2" />
										<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
											Not yet collected
										</p>
										<div className="flex flex-wrap gap-1.5">
											{emptyFields.map((field) => (
												<Badge
													key={field.key}
													variant="outline"
													className="text-[10px] rounded-full border-border/30 text-muted-foreground/60"
												>
													{field.label}
												</Badge>
											))}
										</div>
									</>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
