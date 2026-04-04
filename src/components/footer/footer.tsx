import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

const quickLinks = [
	{ label: "Talk to Counsellor", href: "/agent" },
	{ label: "UK Universities", href: "#destinations" },
	{ label: "Ireland Universities", href: "#destinations" },
	{ label: "IELTS Guidance", href: "#services" },
	{ label: "Visa Support", href: "#services" },
];

const resources = [
	{ label: "Counsellor Dashboard", href: "/dashboard" },
	{ label: "Admin Panel", href: "/admin" },
	{ label: "Knowledge Base", href: "/admin/knowledge" },
];

export default function Footer() {
	return (
		<footer className="bg-card border-t border-border">
			<div className="max-w-7xl mx-auto px-6 py-16">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
					{/* Brand */}
					<div className="space-y-4">
						<Link href="/" className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
								<GraduationCap className="w-5 h-5 text-primary-foreground" />
							</div>
							<span className="text-xl font-bold tracking-tight text-foreground">
								Grad
								<span className="text-primary">Mate</span>
							</span>
						</Link>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Your AI-powered study abroad counsellor.
							Get instant, expert guidance for UK &amp; Ireland
							universities, admissions, and visa processes.
						</p>
					</div>

					{/* Quick Links */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
							Quick Links
						</h3>
						<nav className="flex flex-col gap-2.5">
							{quickLinks.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									className="text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									{link.label}
								</Link>
							))}
						</nav>
					</div>

					{/* Resources */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
							Resources
						</h3>
						<nav className="flex flex-col gap-2.5">
							{resources.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									className="text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									{link.label}
								</Link>
							))}
						</nav>
					</div>

					{/* Contact */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
							Contact
						</h3>
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2.5 text-sm text-muted-foreground">
								<Mail className="w-4 h-4 shrink-0" />
								<span>support@studybuddyai.com</span>
							</div>
							<div className="flex items-center gap-2.5 text-sm text-muted-foreground">
								<Phone className="w-4 h-4 shrink-0" />
								<span>+91 98765 43210</span>
							</div>
							<div className="flex items-center gap-2.5 text-sm text-muted-foreground">
								<MapPin className="w-4 h-4 shrink-0" />
								<span>Mumbai, India</span>
							</div>
						</div>
					</div>
				</div>

				<Separator className="bg-border/60 my-8" />

				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} StudyBuddyAI. All
						rights reserved.
					</p>
					<p>
						Built with AI for the future of education
						counselling.
					</p>
				</div>
			</div>
		</footer>
	);
}
