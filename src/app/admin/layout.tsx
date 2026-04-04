"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
	BarChart3,
	BookOpen,
	UsersRound,
	Settings,
	GraduationCap,
	Menu,
	ChevronLeft,
	PhoneOutgoing,
} from "lucide-react";

const sidebarLinks = [
	{ label: "Analytics", href: "/admin", icon: BarChart3 },
	{ label: "Outbound Calls", href: "/admin/outbound", icon: PhoneOutgoing },
	{ label: "Knowledge Base", href: "/admin/knowledge", icon: BookOpen },
	{ label: "Counsellors", href: "/admin/counsellors", icon: UsersRound },
	{ label: "Settings", href: "/admin/settings", icon: Settings },
];

function SidebarContent({ pathname }: { pathname: string }) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center gap-2.5 px-4 py-5">
				<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
					<GraduationCap className="w-4.5 h-4.5 text-primary-foreground" />
				</div>
				<span className="text-lg font-bold tracking-tight text-foreground">
					Grad<span className="text-primary">Mate</span>
				</span>
			</div>

			<Separator className="bg-border/60" />

			<nav className="flex flex-col gap-1 px-3 py-4 flex-1">
				<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
					Admin Panel
				</span>
				{sidebarLinks.map((link) => {
					const isActive =
						pathname === link.href ||
						(link.href !== "/admin" &&
							pathname.startsWith(link.href));
					return (
						<Link
							key={link.href}
							href={link.href}
							className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:text-foreground hover:bg-accent"
							}`}
						>
							<link.icon className="w-4.5 h-4.5" />
							{link.label}
						</Link>
					);
				})}
			</nav>

			<div className="px-3 pb-4">
				<Separator className="bg-border/60 mb-4" />
				<Link href="/">
					<Button
						variant="ghost"
						className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
						size="sm"
					>
						<ChevronLeft className="w-4 h-4" />
						Back to Website
					</Button>
				</Link>
			</div>
		</div>
	);
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex min-h-screen bg-background">
			<aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 shrink-0">
				<SidebarContent pathname={pathname} />
			</aside>

			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
					>
						<Menu className="w-5 h-5" />
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="w-64 p-0 bg-card">
					<SidebarContent pathname={pathname} />
				</SheetContent>
			</Sheet>

			<main className="flex-1 flex flex-col min-w-0">
				<div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
					{children}
				</div>
			</main>
		</div>
	);
}
