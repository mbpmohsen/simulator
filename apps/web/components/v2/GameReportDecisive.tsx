"use client";

import { Dices, Flag } from "lucide-react";
import type { DecisiveTurn } from "@/lib/gameSummary";
import { outcomeWordingFa } from "@/lib/runtimeTranslationsFa";

/**
 * The turn the game turned on, and why.
 *
 * A result screen that only names a winner leaves the player with nothing to
 * think about. This names the moment, shows the number it hung on, and — where
 * the data supports it — says plainly how close the other outcome was. That
 * "it was a 30 % shot and it landed" is the difference between a player who
 * learns the game is probabilistic and one who concludes they were simply
 * outplayed.
 */

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

const REASON_FA: Record<DecisiveTurn["reason"], string> = {
	threshold: "نوبتی که حد نصاب پیروزی رد شد",
	"biggest-swing": "بزرگ‌ترین جابه‌جایی امتیاز بازی",
	"only-score": "تنها نوبتی که امتیاز جابه‌جا شد",
};

export function GameReportDecisive({
	decisive,
	resolveActionName,
	resolveSiteName,
	timeUnitName,
}: {
	decisive: DecisiveTurn;
	resolveActionName: (code: string) => string;
	resolveSiteName: (siteId: string) => string | null;
	timeUnitName?: string | null;
}) {
	const move = decisive.entry.mine;
	const outcome = outcomeWordingFa(move?.outcomeReason, move?.success === true);
	const site = move?.siteId ? resolveSiteName(move.siteId) : null;

	// Only said when the server reported the numbers. No margin is ever guessed.
	const margin =
		move?.roll !== null &&
		move?.roll !== undefined &&
		move?.appliedProbability !== null &&
		move?.appliedProbability !== undefined
			? Math.abs(move.appliedProbability - move.roll)
			: null;

	return (
		<section className="rounded-lg border border-amber-400/25 bg-amber-500/[0.07] p-5">
			<div className="flex items-center gap-2 text-xs text-amber-200/80">
				<Flag className="size-4" /> {REASON_FA[decisive.reason]}
			</div>
			<h3 className="mt-1.5 text-xl font-black text-slate-100">
				نوبت {faNumber(decisive.turn)}
				{timeUnitName ? ` · ${timeUnitName} ${faNumber(decisive.turn)}` : ""}
			</h3>

			{move ? (
				<>
					<p className="mt-2 text-sm leading-7 text-slate-200">
						«{resolveActionName(move.actionCode)}»{site ? ` روی «${site}»` : ""}{" "}
						— {outcome.label}
						{decisive.pointsGained > 0 && (
							<>
								{" "}
								و{" "}
								<b className="text-violet-200">
									{faNumber(decisive.pointsGained)} امتیاز
								</b>{" "}
								آورد.
							</>
						)}
					</p>
					{move.appliedProbability !== null && (
						<div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
							<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2 py-1 tabular-nums text-slate-300">
								<Dices className="size-3" /> شانس{" "}
								{faNumber(Math.round(move.appliedProbability))}٪
								{move.roll !== null &&
									` · تاس ${faNumber(Math.round(move.roll))}`}
							</span>
							{margin !== null && margin <= 10 && (
								<span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-amber-100">
									فاصله تا نتیجهٔ برعکس: {faNumber(Math.round(margin))} واحد
								</span>
							)}
							{move.outcomeReason === "TARGET_VULNERABLE" && (
								<span className="rounded-lg border border-orange-400/25 bg-orange-400/10 px-2 py-1 text-orange-100">
									بدون تاس نشست — هدف از قبل باز بود
								</span>
							)}
							{move.blockedByCounter && (
								<span className="rounded-lg border border-sky-400/25 bg-sky-400/10 px-2 py-1 text-sky-100">
									پادکنش حریف جلویش را گرفت
								</span>
							)}
						</div>
					)}
					{margin !== null && margin <= 10 && (
						<p className="mt-2 text-[11px] leading-6 text-amber-100/75">
							این نوبت به کمتر از ده واحد تاس بند بود. همان تصمیم با همان اعداد
							می‌توانست برعکس تمام شود — که دقیقاً چیزی است که این بازی می‌خواهد
							نشان دهد.
						</p>
					)}
				</>
			) : (
				<p className="mt-2 text-sm leading-7 text-slate-400">
					در این نوبت امتیاز جابه‌جا شد، اما جزئیات حرکتش به تیم شما گزارش نشده
					است.
				</p>
			)}
		</section>
	);
}
