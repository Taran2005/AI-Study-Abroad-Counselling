"use client";

import { useEffect, useState } from "react";

interface ScoreBarProps {
	label: string;
	score: number; // 0-100
	weight?: string; // e.g. "40%"
	className?: string;
}

/**
 * Animated horizontal bar for score breakdown (Intent, Financial, Timeline).
 */
export default function ScoreBar({
	label,
	score,
	weight,
	className = "",
}: ScoreBarProps) {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => setWidth(score), 100);
		return () => clearTimeout(timer);
	}, [score]);

	return (
		<div className={`flex flex-col gap-1.5 ${className}`}>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-foreground">
					{label}
				</span>
				<div className="flex items-center gap-2">
					{weight && (
						<span className="text-xs text-muted-foreground">
							{weight}
						</span>
					)}
					<span className="text-sm font-semibold text-foreground">
						{score}
					</span>
				</div>
			</div>
			<div className="h-2.5 rounded-full bg-muted overflow-hidden">
				<div
					className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
					style={{ width: `${width}%` }}
				/>
			</div>
		</div>
	);
}
