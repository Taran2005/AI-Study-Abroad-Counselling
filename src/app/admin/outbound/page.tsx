"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import {
	PhoneOutgoing,
	RefreshCw,
	ChevronDown,
	ChevronUp,
	Clock,
	Loader2,
} from "lucide-react";
import type { OutboundCall } from "@/lib/types/database";

export default function OutboundCallsPage() {
	const [calls, setCalls] = useState<OutboundCall[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	// Filters
	const [statusFilter, setStatusFilter] = useState("all");
	const [outcomeFilter, setOutcomeFilter] = useState("all");

	// Initiate call dialog
	const [dialogOpen, setDialogOpen] = useState(false);
	const [initiating, setInitiating] = useState(false);
	const [callForm, setCallForm] = useState({
		phone: "",
		student_name: "",
		call_type: "follow_up",
	});

	const fetchCalls = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ limit: "50", offset: "0" });
			if (statusFilter !== "all") params.set("status", statusFilter);
			if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);

			const res = await fetch(`/api/outbound-calls?${params}`);
			const data = await res.json();
			setCalls(data.calls || []);
			setTotal(data.total || 0);
		} catch (error) {
			console.error("Failed to fetch outbound calls:", error);
		} finally {
			setLoading(false);
		}
	}, [statusFilter, outcomeFilter]);

	useEffect(() => {
		fetchCalls();
	}, [fetchCalls]);

	async function handleInitiateCall() {
		if (!callForm.phone) return;
		setInitiating(true);
		try {
			const res = await fetch("/api/outbound-calls", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					phone: callForm.phone,
					student_name: callForm.student_name || undefined,
					call_type: callForm.call_type,
					triggered_by: "admin",
				}),
			});
			if (res.ok) {
				setDialogOpen(false);
				setCallForm({ phone: "", student_name: "", call_type: "follow_up" });
				fetchCalls();
			} else {
				const err = await res.json();
				alert(`Failed to initiate call: ${err.error || "Unknown error"}`);
			}
		} catch {
			alert("Network error — could not initiate call");
		} finally {
			setInitiating(false);
		}
	}

	function formatDuration(seconds: number) {
		if (!seconds) return "—";
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case "completed":
				return "bg-primary/10 text-primary";
			case "queued":
				return "bg-chart-4/10 text-chart-4";
			case "in-progress":
				return "bg-chart-2/10 text-chart-2";
			case "failed":
				return "bg-destructive/10 text-destructive";
			case "no_answer":
				return "bg-muted text-muted-foreground";
			default:
				return "bg-muted text-muted-foreground";
		}
	}

	function getOutcomeBadgeClass(outcome: string) {
		switch (outcome) {
			case "interested":
				return "bg-primary/10 text-primary";
			case "callback_requested":
				return "bg-chart-4/10 text-chart-4";
			case "not_interested":
				return "bg-muted text-muted-foreground";
			case "voicemail":
				return "bg-chart-3/10 text-chart-3";
			case "no_answer":
				return "bg-muted text-muted-foreground";
			default:
				return "bg-muted text-muted-foreground";
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<PageHeader
					title="Outbound Calls"
					description="Manage and monitor AI follow-up calls via Bolna"
				/>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={fetchCalls}
						className="gap-1.5"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Refresh
					</Button>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button size="sm" className="gap-1.5">
								<PhoneOutgoing className="w-3.5 h-3.5" />
								Initiate Call
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Initiate Outbound Call</DialogTitle>
								<DialogDescription>
									Trigger a follow-up call to a student via Bolna AI agent.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-2">
								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number *</Label>
									<Input
										id="phone"
										placeholder="+91XXXXXXXXXX"
										value={callForm.phone}
										onChange={(e) =>
											setCallForm({ ...callForm, phone: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="name">Student Name</Label>
									<Input
										id="name"
										placeholder="Priya Sharma"
										value={callForm.student_name}
										onChange={(e) =>
											setCallForm({
												...callForm,
												student_name: e.target.value,
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>Call Type</Label>
									<Select
										value={callForm.call_type}
										onValueChange={(val) =>
											setCallForm({ ...callForm, call_type: val })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="follow_up">Follow Up</SelectItem>
											<SelectItem value="appointment_confirm">
												Appointment Confirm
											</SelectItem>
											<SelectItem value="re_engage">Re-engage</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={handleInitiateCall}
									disabled={!callForm.phone || initiating}
								>
									{initiating ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
											Calling...
										</>
									) : (
										<>
											<PhoneOutgoing className="w-3.5 h-3.5 mr-1.5" />
											Call Now
										</>
									)}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="queued">Queued</SelectItem>
						<SelectItem value="in-progress">In Progress</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="failed">Failed</SelectItem>
						<SelectItem value="no_answer">No Answer</SelectItem>
					</SelectContent>
				</Select>

				<Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Outcome" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Outcomes</SelectItem>
						<SelectItem value="interested">Interested</SelectItem>
						<SelectItem value="callback_requested">
							Callback Requested
						</SelectItem>
						<SelectItem value="not_interested">Not Interested</SelectItem>
						<SelectItem value="voicemail">Voicemail</SelectItem>
						<SelectItem value="no_answer">No Answer</SelectItem>
					</SelectContent>
				</Select>

				<span className="flex items-center text-sm text-muted-foreground ml-auto">
					{total} call{total !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Calls Table */}
			{loading ? (
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-14 rounded-lg" />
					))}
				</div>
			) : calls.length === 0 ? (
				<Card className="border-primary/10 bg-card/80">
					<CardContent className="py-16 text-center">
						<PhoneOutgoing className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground text-sm">
							No outbound calls yet. Click &quot;Initiate Call&quot; to make
							your first one.
						</p>
					</CardContent>
				</Card>
			) : (
				<Card className="border-primary/10 bg-card/80">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-semibold text-foreground">
							Call History
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
											Student
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">
											Phone
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
											Type
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
											Status
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
											Outcome
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">
											<div className="flex items-center gap-1">
												<Clock className="w-3 h-3" />
												Duration
											</div>
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">
											Triggered By
										</th>
										<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
											Date
										</th>
										<th className="w-10" />
									</tr>
								</thead>
								<tbody>
									{calls.map((call) => (
										<>
											<tr
												key={call.id}
												className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
												onClick={() =>
													setExpandedId(
														expandedId === call.id ? null : call.id,
													)
												}
											>
												<td className="py-2.5 px-3 text-foreground font-medium">
													{call.student_name || "Unknown"}
												</td>
												<td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">
													{call.student_phone}
												</td>
												<td className="py-2.5 px-3 text-muted-foreground capitalize">
													{call.call_type?.replace("_", " ")}
												</td>
												<td className="py-2.5 px-3">
													<span
														className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(call.call_status)}`}
													>
														{call.call_status}
													</span>
												</td>
												<td className="py-2.5 px-3">
													{call.call_outcome ? (
														<span
															className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOutcomeBadgeClass(call.call_outcome)}`}
														>
															{call.call_outcome.replace(/_/g, " ")}
														</span>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</td>
												<td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">
													{formatDuration(call.duration_secs)}
												</td>
												<td className="py-2.5 px-3 text-muted-foreground capitalize hidden lg:table-cell">
													{call.triggered_by}
												</td>
												<td className="py-2.5 px-3 text-muted-foreground text-xs">
													{new Date(call.initiated_at).toLocaleDateString()}
												</td>
												<td className="py-2.5 px-1">
													{expandedId === call.id ? (
														<ChevronUp className="w-4 h-4 text-muted-foreground" />
													) : (
														<ChevronDown className="w-4 h-4 text-muted-foreground" />
													)}
												</td>
											</tr>
											{expandedId === call.id && (
												<tr key={`${call.id}-detail`}>
													<td
														colSpan={9}
														className="bg-accent/20 px-4 py-4"
													>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
															{/* Summary */}
															{call.call_summary && (
																<div className="md:col-span-2">
																	<h4 className="font-medium text-foreground mb-1">
																		Call Summary
																	</h4>
																	<p className="text-muted-foreground text-sm leading-relaxed">
																		{call.call_summary}
																	</p>
																</div>
															)}

															{/* Extracted Data */}
															{call.extracted_data &&
																Object.keys(call.extracted_data).length > 0 && (
																	<div>
																		<h4 className="font-medium text-foreground mb-2">
																			Extracted Data
																		</h4>
																		<div className="space-y-1">
																			{Object.entries(
																				call.extracted_data,
																			).map(([key, value]) => (
																				<div
																					key={key}
																					className="flex gap-2"
																				>
																					<span className="text-muted-foreground capitalize min-w-[120px]">
																						{key.replace(/_/g, " ")}:
																					</span>
																					<span className="text-foreground text-sm">
																						{typeof value === 'object' && value !== null
																							? JSON.stringify(value, null, 2)
																							: String(value)}
																					</span>
																				</div>
																			))}
																		</div>
																	</div>
																)}

															{/* Recording */}
															{call.recording_url && (
																<div>
																	<h4 className="font-medium text-foreground mb-1">
																		Recording
																	</h4>
																	<a
																		href={call.recording_url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-primary hover:underline text-sm"
																	>
																		🎧 Listen to recording
																	</a>
																</div>
															)}

															{/* Transcript */}
															{call.transcript && (
																<div className="md:col-span-2">
																	<h4 className="font-medium text-foreground mb-1">
																		Transcript
																	</h4>
																	<div className="max-h-48 overflow-y-auto bg-card rounded-lg p-3 border border-border text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
																		{call.transcript}
																	</div>
																</div>
															)}

															{/* Meta */}
															<div className="md:col-span-2 flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
																<span>
																	ID: {call.id.slice(0, 8)}...
																</span>
																{call.bolna_execution_id && (
																	<span>
																		Execution:{" "}
																		{call.bolna_execution_id.slice(
																			0,
																			12,
																		)}
																		...
																	</span>
																)}
																{call.conversation_id && (
																	<span>
																		Linked conversation:{" "}
																		{call.conversation_id.slice(0, 8)}
																		...
																	</span>
																)}
															</div>
														</div>
													</td>
												</tr>
											)}
										</>
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
