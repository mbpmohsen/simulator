"use client";

import type { PlayerAiLevelResponse } from "@workspace/trpc";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Bot, LoaderCircle, RefreshCw } from "lucide-react";
import { AiAssistantLevelCard } from "@/components/v2/ai/AiAssistantLevelCard";

interface AiAssistantUpgradePanelProps {
	level: PlayerAiLevelResponse | null;
	loading?: boolean;
	purchasing?: boolean;
	error?: string | null;
	unavailableMessage?: string | null;
	isLeader: boolean;
	onPurchase: () => void;
	onRefresh?: () => void;
}

const formatNumberFa = (value: number): string => value.toLocaleString("fa-IR");

const getStatusMessage = (
	level: PlayerAiLevelResponse | null,
	isLeader: boolean,
	loading: boolean,
	unavailableMessage?: string | null,
): string => {
	if (loading && !level) return "در حال دریافت وضعیت AI…";
	if (unavailableMessage) return unavailableMessage;
	if (!level) return "AI برای این بازی فعال نیست.";
	if (level.next_level === null) return "AI به بالاترین سطح رسیده است.";
	if (!isLeader) return "فقط رهبر تیم می‌تواند ارتقا بخرد.";
	if (level.already_purchased_this_turn)
		return "این نوبت ارتقا خریداری شده است.";
	if (!level.can_afford) return "اعتبار تیم برای خرید این سطح کافی نیست.";
	return `سطح ${formatNumberFa(level.next_level)} با هزینه ${formatNumberFa(level.next_cost ?? 0)} اعتبار آماده خرید است.`;
};

export function AiAssistantUpgradePanel({
	level,
	loading = false,
	purchasing = false,
	error,
	unavailableMessage,
	isLeader,
	onPurchase,
	onRefresh,
}: AiAssistantUpgradePanelProps) {
	const canBuy = Boolean(
		level &&
			isLeader &&
			level.can_afford &&
			!level.already_purchased_this_turn &&
			level.next_level !== null &&
			!loading &&
			!purchasing &&
			!unavailableMessage,
	);
	const status = getStatusMessage(level, isLeader, loading, unavailableMessage);

	return (
		<Card className="border-white/10 bg-slate-950/55 text-slate-100">
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2 text-base">
					<span className="flex items-center gap-2">
						<Bot className="size-5 text-cyan-300" /> AI
					</span>
					{onRefresh && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onRefresh}
							disabled={loading}
							className="text-slate-400 hover:text-cyan-100"
						>
							<RefreshCw
								className={`size-4 ${loading ? "animate-spin" : ""}`}
							/>
						</Button>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<AiAssistantLevelCard
					level={level}
					loading={loading}
					unavailableMessage={unavailableMessage}
				/>
				<Button
					type="button"
					onClick={onPurchase}
					disabled={!canBuy}
					className="w-full bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{purchasing ? (
						<LoaderCircle className="size-4 animate-spin" />
					) : (
						<Bot className="size-4" />
					)}
					خرید ارتقا
				</Button>
				{error && <p className="text-sm text-rose-300">{error}</p>}
				<p
					className={`text-xs leading-6 ${canBuy ? "text-cyan-200" : "text-slate-500"}`}
				>
					{status}
				</p>
			</CardContent>
		</Card>
	);
}
