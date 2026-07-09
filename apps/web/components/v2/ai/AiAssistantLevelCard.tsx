"use client";

import type { PlayerAiLevelResponse } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Bot, Coins, TrendingUp } from "lucide-react";

interface AiAssistantLevelCardProps {
	level: PlayerAiLevelResponse | null;
	loading?: boolean;
	unavailableMessage?: string | null;
}

const formatNumberFa = (value: number): string => value.toLocaleString("fa-IR");

export function AiAssistantLevelCard({
	level,
	loading = false,
	unavailableMessage,
}: AiAssistantLevelCardProps) {
	if (unavailableMessage) {
		return (
			<div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
				{unavailableMessage}
			</div>
		);
	}

	if (!level) {
		return (
			<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
				{loading ? "در حال دریافت وضعیت AI…" : "سطح AI هنوز دریافت نشده است."}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
					<div className="flex items-center gap-1.5 text-xs text-cyan-200">
						<Bot className="size-3.5" /> سطح فعلی AI
					</div>
					<div className="mt-2 text-2xl font-black">
						{formatNumberFa(level.current_level)}
					</div>
				</div>
				<div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
					<div className="flex items-center gap-1.5 text-xs text-amber-100">
						<Coins className="size-3.5" /> اعتبار فعلی
					</div>
					<div className="mt-2 text-2xl font-black">
						{formatNumberFa(level.credits)}
					</div>
				</div>
			</div>
			<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
				{level.next_level === null ? (
					"AI به بالاترین سطح رسیده است."
				) : (
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="bg-cyan-500/10 text-cyan-100">
							<TrendingUp className="size-3.5" /> سطح بعدی{" "}
							{formatNumberFa(level.next_level)}
						</Badge>
						<span>
							هزینه ارتقا:{" "}
							<strong className="text-amber-100">
								{formatNumberFa(level.next_cost ?? 0)}
							</strong>
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
