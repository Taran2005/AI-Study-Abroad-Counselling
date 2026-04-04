"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import { UsersRound, Plus, Mail, CalendarDays } from "lucide-react";

// Placeholder counsellor data
const counsellors = [
	{
		id: "1",
		name: "Priya Sharma",
		email: "priya@studybuddyai.com",
		available: true,
		appointments: 12,
	},
	{
		id: "2",
		name: "Rahul Mehta",
		email: "rahul@studybuddyai.com",
		available: true,
		appointments: 8,
	},
	{
		id: "3",
		name: "Ananya Sen",
		email: "ananya@studybuddyai.com",
		available: false,
		appointments: 15,
	},
];

export default function CounsellorsPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Counsellors"
				description="Manage your counselling team"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Counsellors" },
				]}
				actions={
					<Dialog>
						<DialogTrigger asChild>
							<Button className="rounded-full gap-2">
								<Plus className="w-4 h-4" />
								Add Counsellor
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle className="text-foreground">
									Add Counsellor
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 mt-4">
								<div className="space-y-2">
									<Label htmlFor="c-name">Full Name</Label>
									<Input
										id="c-name"
										placeholder="e.g. Priya Sharma"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="c-email">Email</Label>
									<Input
										id="c-email"
										placeholder="priya@studybuddyai.com"
										type="email"
									/>
								</div>
								<Button className="w-full rounded-full">
									Add Counsellor
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				}
			/>

			{counsellors.length === 0 ? (
				<EmptyState
					icon={UsersRound}
					title="No counsellors added"
					description="Add counsellors who will handle follow-ups with hot leads."
				/>
			) : (
				<Card className="border-primary/10 bg-card/80 overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent border-border/60">
								<TableHead className="text-muted-foreground font-semibold">
									Name
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold hidden sm:table-cell">
									Email
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold">
									Status
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold hidden md:table-cell">
									Appointments
								</TableHead>
								<TableHead className="text-muted-foreground font-semibold">
									Available
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{counsellors.map((c) => (
								<TableRow
									key={c.id}
									className="hover:bg-accent/40 transition-colors border-border/40"
								>
									<TableCell className="font-medium text-foreground">
										{c.name}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
										<div className="flex items-center gap-1.5">
											<Mail className="w-3.5 h-3.5" />
											{c.email}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className={`text-xs rounded-full ${
												c.available
													? "border-primary/25 text-primary bg-primary/5"
													: "border-border text-muted-foreground"
											}`}
										>
											{c.available
												? "Online"
												: "Offline"}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground hidden md:table-cell">
										<div className="flex items-center gap-1.5">
											<CalendarDays className="w-3.5 h-3.5" />
											{c.appointments}
										</div>
									</TableCell>
									<TableCell>
										<Switch
											defaultChecked={c.available}
										/>
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
