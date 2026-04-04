"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { Radio, Clock, Mic, Brain, Volume2 } from "lucide-react";

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

	useEffect(() => {
		async function fetchLive() {
			try {
				const res = await fetch("/api/conversations?status=live&limit=20");
				const data = await res.json();
				setConversations(data.conversations || []);
			} catch (error) {
				console.error("Failed to fetch live conversations:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchLive();
		// Poll every 10 seconds for live data
		const interval = setInterval(fetchLive, 10000);
		return () => clearInterval(interval);
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
					<Badge
						variant="outline"
						className="gap-1.5 rounded-full border-primary/25 text-primary"
					>
						<span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						{conversations.length} Active
					</Badge>
				}
			/>

			{conversations.length === 0 ? (
				<EmptyState
					icon={Radio}
					title="No active calls"
					description="When students start a conversation with the AI counsellor, live sessions will appear here."
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

								{/* Fake waveform visualization */}
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
