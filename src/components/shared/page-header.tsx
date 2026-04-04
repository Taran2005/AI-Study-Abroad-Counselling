import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
	title: string;
	description?: string;
	breadcrumbs?: { label: string; href?: string }[];
	actions?: React.ReactNode;
}

/**
 * Consistent page header with title, description, breadcrumbs, and action slot.
 */
export default function PageHeader({
	title,
	description,
	breadcrumbs,
	actions,
}: PageHeaderProps) {
	return (
		<div className="space-y-4">
			{breadcrumbs && breadcrumbs.length > 0 && (
				<nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
					{breadcrumbs.map((crumb, i) => (
						<span key={crumb.label} className="flex items-center gap-1.5">
							{i > 0 && <span className="text-border">/</span>}
							{crumb.href ? (
								<a
									href={crumb.href}
									className="hover:text-foreground transition-colors"
								>
									{crumb.label}
								</a>
							) : (
								<span className="text-foreground font-medium">
									{crumb.label}
								</span>
							)}
						</span>
					))}
				</nav>
			)}
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					{description && (
						<p className="text-muted-foreground">{description}</p>
					)}
				</div>
				{actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
			</div>
			<Separator className="bg-border/60" />
		</div>
	);
}
