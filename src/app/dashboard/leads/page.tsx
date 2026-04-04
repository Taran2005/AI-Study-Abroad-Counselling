"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ClassificationBadge from "@/components/shared/classification-badge";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { Search, Users, ChevronRight } from "lucide-react";
import type { LeadClassification } from "@/lib/types/database";

interface Lead {
	id: string;
	conversation_id: string;
	student_id: string | null;
	intent_score: number;
	financial_score: number;
	timeline_score: number;
	total_score: number;
	classification: LeadClassification;
	created_at: string;
	conversations: {
		id: string;
		room_name: string;
		started_at: string;
		ended_at: string | null;
		duration_secs: number | null;
		status: string;
		language: string;
	} | null;
}

export default function LeadsPage() {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<string>("all");
	const [search, setSearch] = useState("");

	useEffect(() => {
		async function fetchLeads() {
			setLoading(true);
			try {
				const params = new URLSearchParams({ limit: "50" });
				if (filter !== "all") params.set("classification", filter);
				const res = await fetch(`/api/leads?${params}`);
				const data = await res.json();
				setLeads(data.leads || []);
			} catch (error) {
				console.error("Failed to fetch leads:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchLeads();
	}, [filter]);

	const filteredLeads = search
		? leads.filter(
				(l) =>
					l.conversations?.room_name
						?.toLowerCase()
						.includes(search.toLowerCase()) ||
					l.id.toLowerCase().includes(search.toLowerCase()),
			)
		: leads;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Leads"
				description="View and manage student leads from AI conversations"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Leads" },
				]}
			/>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search leads..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={filter} onValueChange={setFilter}>
					<SelectTrigger className="w-full sm:w-44">
						<SelectValue placeholder="All Classifications" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Classifications</SelectItem>
						<SelectItem value="hot">🔥 Hot</SelectItem>
						<SelectItem value="warm">☀️ Warm</SelectItem>
						<SelectItem value="cold">❄️ Cold</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			{loading ? (
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-14 rounded-lg" />
					))}
				</div>
			) : filteredLeads.length === 0 ? (
				<EmptyState
					icon={Users}
					title="No leads found"
					description="Leads will appear here after students complete their AI counselling sessions."
				/>
			) : (
				<Card className="border-primary/10 bg-card/80 overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent border-border/60">
								<TableHead className="text-muted-foreground font-semibold">
									Room
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold">
									Score
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold">
									Classification
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold hidden sm:table-cell">
									Date
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold hidden md:table-cell">
									Status
								</TableHead>
								<TableHead className="w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredLeads.map((lead, i) => (
								<TableRow
									key={lead.id}
									className="group hover:bg-accent/40 transition-colors duration-200 border-border/40 cursor-pointer"
									style={{
										animationDelay: `${i * 50}ms`,
									}}
								>
									<TableCell className="font-medium text-foreground">
										{lead.conversations?.room_name ||
											"—"}
									</TableCell>
									<TableCell>
										<span
											className={`text-sm font-bold ${
												lead.total_score >= 70
													? "text-primary"
													: lead.total_score >= 40
														? "text-chart-4"
														: "text-muted-foreground"
											}`}
										>
											{lead.total_score}
										</span>
									</TableCell>
									<TableCell>
										<ClassificationBadge
											classification={
												lead.classification
											}
											size="sm"
										/>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
										{new Date(
											lead.created_at,
										).toLocaleDateString()}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-medium ${
												lead.conversations
													?.status ===
												"completed"
													? "bg-primary/10 text-primary"
													: lead.conversations
																?.status ===
														  "live"
														? "bg-chart-1/10 text-chart-1"
														: "bg-muted text-muted-foreground"
											}`}
										>
											{lead.conversations
												?.status || "—"}
										</span>
									</TableCell>
									<TableCell>
										<Link
											href={`/dashboard/leads/${lead.id}`}
										>
											<Button
												variant="ghost"
												size="icon"
												className="opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<ChevronRight className="w-4 h-4" />
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	);
}
