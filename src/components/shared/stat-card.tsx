"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
	icon: LucideIcon;
	label: string;
	value: number | string;
	suffix?: string;
	prefix?: string;
	change?: number; // percentage change
	className?: string;
}

/**
 * Animated KPI card with count-up effect.
 * Uses only theme tokens — primary, muted, foreground, card.
 */
export default function StatCard({
	icon: Icon,
	label,
	value,
	suffix = "",
	prefix = "",
	change,
	className = "",
}: StatCardProps) {
	const isNumeric = typeof value === "number";
	const [displayValue, setDisplayValue] = useState(isNumeric ? 0 : value);

	useEffect(() => {
		if (!isNumeric) {
			setDisplayValue(value);
			return;
		}

		const numVal = value as number;
		const duration = 1200;
		const steps = 40;
		const stepTime = duration / steps;
		let current = 0;
		const increment = numVal / steps;

		const timer = setInterval(() => {
			current += increment;
			if (current >= numVal) {
				setDisplayValue(numVal);
				clearInterval(timer);
			} else {
				setDisplayValue(Math.floor(current));
			}
		}, stepTime);

		return () => clearInterval(timer);
	}, [value, isNumeric]);

	const formattedValue = typeof displayValue === "number"
		? displayValue.toLocaleString()
		: displayValue;

	return (
		<Card
			className={`group relative overflow-hidden border-primary/10 bg-card/80 backdrop-blur-sm hover:border-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${className}`}
		>
			<CardContent className="flex items-center gap-4 py-5 px-5">
				<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
					<Icon className="w-6 h-6 text-primary" />
				</div>
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="text-2xl font-bold text-foreground tracking-tight">
						{prefix}
						{formattedValue}
						{suffix}
					</div>
					<div className="text-sm text-muted-foreground font-medium truncate">
						{label}
					</div>
				</div>
				{change !== undefined && (
					<div
						className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
							change >= 0
								? "bg-primary/10 text-primary"
								: "bg-destructive/10 text-destructive"
						}`}
					>
						{change >= 0 ? "+" : ""}
						{change}%
					</div>
				)}
			</CardContent>
			<div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
		</Card>
	);
}
