"use client";

import { Button } from "@workspace/ui/components/button";
import { Bot, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

interface SubjectAiButtonProps {
	aiLevel: number;
	loading?: boolean;
	disabledMessage?: string | null;
	onClick: () => void;
	variant?: "icon" | "text";
}

export function SubjectAiButton({
	aiLevel,
	loading = false,
	disabledMessage,
	onClick,
	variant = "icon",
}: SubjectAiButtonProps) {
	const locked = aiLevel <= 0 || Boolean(disabledMessage);
	const title =
		disabledMessage ??
		(locked
			? "برای مشاهده تحلیل، ابتدا AI را ارتقا دهید."
			: "تحلیل موضوع با AI");
	const Icon = loading ? LoaderCircle : locked ? LockKeyhole : Sparkles;

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={onClick}
			disabled={locked || loading}
			title={title}
			aria-label={title}
			className={
				locked
					? "border-slate-600/40 bg-slate-900/40 text-slate-500"
					: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
			}
		>
			<Icon className={`size-4 ${loading ? "animate-spin" : ""}`} />
			{variant === "text" && (
				<span className="hidden sm:inline">
					{locked ? "تحلیل هوشمند قفل است" : "تحلیل هوشمند"}
				</span>
			)}
			{variant === "icon" && <Bot className="sr-only" />}
		</Button>
	);
}
