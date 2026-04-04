"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
	score: number; // 0-100
	size?: number;
	strokeWidth?: number;
	label?: string;
	className?: string;
}

/**
 * Animated circular gauge for lead scores.
 * Color coding: 0-39 = cold (destructive), 40-69 = warm (chart-4), 70-100 = hot (primary).
 */
export default function ScoreGauge({
	score,
	size = 140,
	strokeWidth = 10,
	label,
	className = "",
}: ScoreGaugeProps) {
	const [animatedScore, setAnimatedScore] = useState(0);

	useEffect(() => {
		const duration = 1000;
		const steps = 50;
		const stepTime = duration / steps;
		let current = 0;
		const increment = score / steps;

		const timer = setInterval(() => {
			current += increment;
			if (current >= score) {
				setAnimatedScore(score);
				clearInterval(timer);
			} else {
				setAnimatedScore(Math.floor(current));
			}
		}, stepTime);

		return () => clearInterval(timer);
	}, [score]);

	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progress = (animatedScore / 100) * circumference;
	const offset = circumference - progress;

	const getClassification = (s: number) => {
		if (s >= 70) return { label: "Hot", colorClass: "text-primary" };
		if (s >= 40)
			return { label: "Warm", colorClass: "text-chart-4" };
		return { label: "Cold", colorClass: "text-muted-foreground" };
	};

	const classification = getClassification(score);

	return (
		<div
			className={`relative inline-flex items-center justify-center ${className}`}
		>
			<svg width={size} height={size} className="-rotate-90">
				{/* Background track */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					className="stroke-muted"
					strokeWidth={strokeWidth}
				/>
				{/* Foreground arc */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					className={`${classification.colorClass.replace("text-", "stroke-")} transition-all duration-300`}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
				/>
			</svg>
			{/* Center text */}
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span
					className={`text-3xl font-bold tracking-tight ${classification.colorClass}`}
				>
					{animatedScore}
				</span>
				<span className="text-xs text-muted-foreground font-medium">
					{label || classification.label}
				</span>
			</div>
		</div>
	);
}
