import { Badge } from "@/components/ui/badge";
import type { LeadClassification } from "@/lib/types/database";

interface ClassificationBadgeProps {
	classification: LeadClassification;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const config: Record<
	LeadClassification,
	{ label: string; emoji: string; classes: string }
> = {
	hot: {
		label: "Hot",
		emoji: "🔥",
		classes:
			"bg-primary/15 text-primary border-primary/25 hover:bg-primary/20",
	},
	warm: {
		label: "Warm",
		emoji: "☀️",
		classes:
			"bg-chart-4/15 text-chart-4 border-chart-4/25 hover:bg-chart-4/20",
	},
	cold: {
		label: "Cold",
		emoji: "❄️",
		classes:
			"bg-muted text-muted-foreground border-border hover:bg-muted/80",
	},
};

/**
 * Color-coded lead classification badge.
 */
export default function ClassificationBadge({
	classification,
	size = "md",
	className = "",
}: ClassificationBadgeProps) {
	const { label, emoji, classes } = config[classification];

	const sizeClasses = {
		sm: "text-xs px-2 py-0.5",
		md: "text-sm px-3 py-1",
		lg: "text-base px-4 py-1.5",
	};

	return (
		<Badge
			variant="outline"
			className={`font-semibold gap-1 rounded-full transition-all duration-300 ${classes} ${sizeClasses[size]} ${className}`}
		>
			<span>{emoji}</span>
			{label}
		</Badge>
	);
}
