"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { Radio, Clock, Mic, Volume2, Wifi, WifiOff } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface LiveConversation {
	id: string;
	room_name: string;
	started_at: string;
	status: string;
	language: string;
}

export default function LiveConversationsPage() {
	const [conversations, setConversations] = useState<LiveConversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [realtimeConnected, setRealtimeConnected] = useState(false);
	const elapsedTimers = useRef<Record<string, NodeJS.Timeout>>({});

	// Initial fetch from API
	const fetchLive = useCallback(async () => {
		try {
			const res = await fetch("/api/conversations?status=live&limit=50");
			const data = await res.json();
			setConversations(data.conversations || []);
		} catch (error) {
			console.error("Failed to fetch live conversations:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLive();

		// Subscribe to Realtime changes on the conversations table
		const channel = supabaseBrowser
			.channel("live-conversations")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "conversations",
					filter: "status=eq.live",
				},
				(payload) => {
					const newConvo = payload.new as LiveConversation;
					setConversations((prev) => {
						// Avoid duplicates
						if (prev.some((c) => c.id === newConvo.id)) return prev;
						return [newConvo, ...prev];
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "conversations",
				},
				(payload) => {
					const updated = payload.new as LiveConversation;
					if (updated.status !== "live") {
						// Conversation is no longer live — remove it
						setConversations((prev) =>
							prev.filter((c) => c.id !== updated.id),
						);
					} else {
						// Update in place
						setConversations((prev) =>
							prev.map((c) =>
								c.id === updated.id ? updated : c,
							),
						);
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "conversations",
				},
				(payload) => {
					const deleted = payload.old as { id: string };
					setConversations((prev) =>
						prev.filter((c) => c.id !== deleted.id),
					);
				},
			)
			.subscribe((status) => {
				setRealtimeConnected(status === "SUBSCRIBED");
			});

		return () => {
			supabaseBrowser.removeChannel(channel);
			// Clean up all elapsed timers
			for (const timer of Object.values(elapsedTimers.current)) {
				clearInterval(timer);
			}
		};
	}, [fetchLive]);

	// Force re-render every second to update elapsed times
	const [, setTick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(timer);
	}, []);

	function getElapsedTime(startedAt: string) {
		const elapsed = Math.floor(
			(Date.now() - new Date(startedAt).getTime()) / 1000,
		);
		const m = Math.floor(elapsed / 60);
		const s = elapsed % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader title="Live Conversations" />
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-40 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Live Conversations"
				description="Monitor active AI counselling sessions in real-time"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Live Calls" },
				]}
				actions={
					<div className="flex items-center gap-3">
						<Badge
							variant="outline"
							className={`gap-1.5 rounded-full text-xs ${
								realtimeConnected
									? "border-primary/25 text-primary"
									: "border-destructive/25 text-destructive"
							}`}
						>
							{realtimeConnected ? (
								<Wifi className="w-3 h-3" />
							) : (
								<WifiOff className="w-3 h-3" />
							)}
							{realtimeConnected ? "Live" : "Reconnecting..."}
						</Badge>
						<Badge
							variant="outline"
							className="gap-1.5 rounded-full border-primary/25 text-primary"
						>
							<span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
							{conversations.length} Active
						</Badge>
					</div>
				}
			/>

			{conversations.length === 0 ? (
				<EmptyState
					icon={Radio}
					title="No active calls"
					description="When students start a conversation with the AI counsellor, live sessions will appear here automatically via Supabase Realtime."
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{conversations.map((convo) => (
						<Card
							key={convo.id}
							className="border-primary/10 bg-card/80 hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
						>
							{/* Animated pulse border */}
							<div className="absolute inset-0 rounded-lg border-2 border-primary/20 animate-pulse pointer-events-none" />

							<CardContent className="py-5 px-5 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
											<Mic className="w-4 h-4 text-primary" />
										</div>
										<div>
											<p className="text-sm font-semibold text-foreground">
												{convo.room_name || "Session"}
											</p>
											<p className="text-xs text-muted-foreground">
												{convo.language === "hi"
													? "Hindi"
													: "English"}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className="text-xs rounded-full border-primary/25 text-primary gap-1"
									>
										<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
										Live
									</Badge>
								</div>

								<div className="flex items-center gap-4">
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<Clock className="w-3.5 h-3.5" />
										{getElapsedTime(convo.started_at)}
									</div>
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<Volume2 className="w-3.5 h-3.5" />
										Active
									</div>
								</div>

								{/* Waveform visualization */}
								<div className="flex items-end gap-0.5 h-8">
									{Array.from({ length: 20 }).map((_, i) => (
										<div
											key={i}
											className="flex-1 bg-primary/30 rounded-t-sm animate-pulse"
											style={{
												height: `${20 + Math.random() * 80}%`,
												animationDelay: `${i * 100}ms`,
												animationDuration: `${800 + Math.random() * 400}ms`,
											}}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
