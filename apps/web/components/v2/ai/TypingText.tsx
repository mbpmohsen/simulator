"use client";

import { Button } from "@workspace/ui/components/button";
import { useEffect, useState } from "react";

interface TypingTextProps {
	text: string;
	speedMs?: number;
	resetKey?: string | number;
	className?: string;
}

export function TypingText({
	text,
	speedMs = 18,
	resetKey,
	className,
}: TypingTextProps) {
	const [visibleLength, setVisibleLength] = useState(0);
	const done = visibleLength >= text.length;

	useEffect(() => {
		void text;
		void resetKey;
		setVisibleLength(0);
	}, [text, resetKey]);

	useEffect(() => {
		if (done) return;
		const timer = window.setTimeout(() => {
			setVisibleLength((current) => Math.min(text.length, current + 2));
		}, speedMs);
		return () => window.clearTimeout(timer);
	}, [done, speedMs, text.length]);

	return (
		<div dir="rtl" className="space-y-3 text-right">
			<div className={className}>{text.slice(0, visibleLength)}</div>
			{!done && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setVisibleLength(text.length)}
					className="border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
				>
					نمایش کامل تحلیل
				</Button>
			)}
		</div>
	);
}
