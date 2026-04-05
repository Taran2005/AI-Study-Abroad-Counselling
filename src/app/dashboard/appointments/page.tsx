"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { CalendarDays, Clock, User, Loader2 } from "lucide-react";

export default function AppointmentsPage() {
	const [appointments, setAppointments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchAppointments() {
			try {
				const res = await fetch("/api/appointments");
				if (!res.ok) throw new Error("Failed to fetch");
				const data = await res.json();
				setAppointments(data.appointments || []);
			} catch (error) {
				console.error("Error fetching appointments:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchAppointments();
	}, []);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Appointments"
				description="Manage upcoming counselling sessions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Appointments" },
				]}
			/>

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
				</div>
			) : appointments.length === 0 ? (
				<EmptyState
					icon={CalendarDays}
					title="No appointments scheduled"
					description="When students book counselling sessions through the AI agent, they'll appear here."
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{appointments.map((apt) => {
						const dateObj = new Date(apt.scheduled_at);
						const formattedDate = dateObj.toLocaleDateString("en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
							year: "numeric",
						});
						const formattedTime = dateObj.toLocaleTimeString("en-US", {
							hour: "numeric",
							minute: "2-digit",
						});

						return (
							<Card
								key={apt.id}
								className="border-primary/10 bg-card/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
							>
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<CardTitle className="text-sm font-semibold text-foreground">
											{apt.student_name || "Unknown Student"}
										</CardTitle>
										<Badge
											variant="outline"
											className="text-xs capitalize rounded-full border-border"
										>
											{apt.status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<CalendarDays className="w-4 h-4" />
										<span>{formattedDate}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Clock className="w-4 h-4" />
										<span>{formattedTime}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<User className="w-4 h-4" />
										<span>
											{apt.counsellor?.full_name || "Unassigned"}
										</span>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
