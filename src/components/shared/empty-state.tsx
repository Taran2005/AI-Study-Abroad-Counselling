import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
	className?: string;
}

/**
 * Reusable empty state placeholder with icon, text, and optional CTA.
 */
export default function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	onAction,
	className = "",
}: EmptyStateProps) {
	return (
		<div
			className={`flex flex-col items-center justify-center gap-4 py-16 px-6 text-center ${className}`}
		>
			<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
				<Icon className="w-8 h-8 text-muted-foreground" />
			</div>
			<div className="space-y-1.5">
				<h3 className="text-lg font-semibold text-foreground">
					{title}
				</h3>
				<p className="text-sm text-muted-foreground max-w-sm">
					{description}
				</p>
			</div>
			{actionLabel && onAction && (
				<Button
					onClick={onAction}
					className="rounded-full px-6 mt-2"
				>
					{actionLabel}
				</Button>
			)}
		</div>
	);
}
