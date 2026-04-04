"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { CalendarDays, Clock, User } from "lucide-react";

export default function AppointmentsPage() {
	// Placeholder — will be connected to Supabase appointments table
	const appointments: {
		id: string;
		student: string;
		counsellor: string;
		date: string;
		time: string;
		status: string;
	}[] = [];

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

			{appointments.length === 0 ? (
				<EmptyState
					icon={CalendarDays}
					title="No appointments scheduled"
					description="When students book counselling sessions through the AI agent, they'll appear here."
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{appointments.map((apt) => (
						<Card
							key={apt.id}
							className="border-primary/10 bg-card/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-semibold text-foreground">
										{apt.student}
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
									<span>{apt.date}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span>{apt.time}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<User className="w-4 h-4" />
									<span>{apt.counsellor}</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
