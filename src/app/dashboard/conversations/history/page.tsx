"use client";

import { Clock, Mic, Radio, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Conversation {
  id: string;
  room_name: string;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  status: string;
  language: string;
}

export default function ConversationHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations?status=completed&limit=50");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompleted();

    const channel = supabaseBrowser
      .channel("conversation-history")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: "status=eq.completed",
        },
        (payload) => {
          const newConvo = payload.new as Conversation;
          setConversations((prev) => [newConvo, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [fetchCompleted]);

  function formatDuration(
    startedAt: string,
    endedAt: string | null,
    durationSecs: number | null,
  ) {
    if (durationSecs && durationSecs > 0) {
      const m = Math.floor(durationSecs / 60);
      const s = durationSecs % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    if (endedAt) {
      const elapsed = Math.floor(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      );
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return "--:--";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conversation History" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversation History"
        description="Past AI counselling sessions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Live Calls", href: "/dashboard/conversations" },
          { label: "History" },
        ]}
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No completed conversations"
          description="Completed sessions will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.map((convo) => (
            <Link
              key={convo.id}
              href={`/dashboard/conversations/${convo.id}`}
              className="block"
            >
              <Card className="border-border/40 bg-card/80 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="py-5 px-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Mic className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {convo.room_name || "Session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {convo.language === "hi" ? "Hindi" : "English"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs rounded-full border-muted-foreground/25 text-muted-foreground"
                    >
                      Completed
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(
                        convo.started_at,
                        convo.ended_at,
                        convo.duration_secs,
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Volume2 className="w-3.5 h-3.5" />
                      Ended
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDate(convo.started_at)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
