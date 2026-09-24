"use client";

import type { GovernmentOrderType } from "@workspace/trpc";
import {
	Dices,
	Gavel,
	ShieldAlert,
	ShieldCheck,
	Swords,
	Trophy,
} from "lucide-react";
import type { TurnEntry } from "@/lib/gameSummary";
import {
	formatOrderTypeFa,
	type OutcomeTone,
	outcomeWordingFa,
} from "@/lib/runtimeTranslationsFa";

/**
 * The game, turn by turn: what this team played, what the other side played,
 * whether the counter gate caught, what the dice said, and what it was worth.
 *
 * The scoreboard says who won. This says how — and it is the only place a
 * player can go back and see that the turn they lost was a 90 % roll that
 * missed rather than a bad decision.
 */

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

const TONE_TEXT: Record<OutcomeTone, string> = {
	success: "text-emerald-200",
	failure: "text-orange-200",
	blocked: "text-sky-200",
	neutral: "text-cyan-200",
};

const TONE_DOT: Record<OutcomeTone, string> = {
	success: "bg-emerald-400",
	failure: "bg-orange-400",
	blocked: "bg-sky-400",
	neutral: "bg-cyan-400",
};

export interface GameReportTimelineProps {
	turns: TurnEntry[];
	resolveActionName: (code: string) => string;
	resolveSiteName: (siteId: string) => string | null;
	resolveSubjectName: (subjectId: string) => string | null;
	/** «ماه» and the like, when the game declared one. */
	timeUnitName?: string | null;
	/** Highlighted as the turn that decided the game. */
	decisiveTurn?: number | null;
}

export function GameReportTimeline({
	turns,
	resolveActionName,
	resolveSiteName,
	resolveSubjectName,
	timeUnitName,
	decisiveTurn,
}: GameReportTimelineProps) {
	if (turns.length === 0) return null;

	return (
		<div className="overflow-hidden rounded-lg border border-white/10">
			{turns.map((entry, index) => {
				const mineOutcome = outcomeWordingFa(
					entry.mine?.outcomeReason,
					entry.mine?.success === true,
				);
				const theirsOutcome = outcomeWordingFa(
					entry.theirs?.outcomeReason,
					entry.theirs?.success === true,
				);
				const site = entry.mine?.siteId
					? resolveSiteName(entry.mine.siteId)
					: null;
				const decisive = decisiveTurn === entry.turn;
				return (
					<article
						key={entry.turn}
						className={`border-white/8 p-4 ${index > 0 ? "border-t" : ""} ${
							decisive ? "bg-amber-400/[0.06]" : "bg-[#0d121c]"
						}`}
					>
						<header className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/30 text-xs font-black tabular-nums text-slate-200">
									{faNumber(entry.turn)}
								</span>
								<span className="text-xs text-slate-400">
									نوبت {faNumber(entry.turn)}
									{timeUnitName
										? ` · ${timeUnitName} ${faNumber(entry.turn)}`
										: ""}
								</span>
								{decisive && (
									<span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-100">
										<Trophy className="size-3" /> نوبت تعیین‌کننده
									</span>
								)}
							</div>
							<div className="flex items-center gap-3 text-xs tabular-nums">
								{entry.pointsGained > 0 ? (
									<span className="text-violet-200">
										+{faNumber(entry.pointsGained)} امتیاز
									</span>
								) : (
									<span className="text-slate-600">بدون امتیاز</span>
								)}
								<span className="text-slate-500">
									مجموع {faNumber(entry.pointsTotal)}
								</span>
								{entry.creditsAfter !== null && (
									<span className="text-amber-200/70">
										{faNumber(entry.creditsAfter)} اعتبار
									</span>
								)}
							</div>
						</header>

						{entry.orders.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-1.5">
								{entry.orders.map((order, orderIndex) => {
									const subject = order.subjectId
										? resolveSubjectName(order.subjectId)
										: null;
									return (
										<span
											key={`${order.orderType}-${orderIndex}`}
											className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-2 py-1 text-[11px] text-amber-100"
										>
											<Gavel className="size-3" />
											دستور دولت:{" "}
											{order.orderType
												? formatOrderTypeFa(
														order.orderType as GovernmentOrderType,
													)
												: "نامشخص"}
											{subject ? ` · روی «${subject}»` : ""}
											{order.actionCode
												? ` · ${resolveActionName(order.actionCode)}`
												: ""}
										</span>
									);
								})}
							</div>
						)}

						<div className="mt-3 grid gap-2 sm:grid-cols-2">
							<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3">
								<div className="text-[11px] text-cyan-200/70">تیم شما</div>
								{entry.mine ? (
									<>
										<div className="mt-1 flex items-center gap-2">
											<span
												className={`size-2 shrink-0 rounded-full ${TONE_DOT[mineOutcome.tone]}`}
											/>
											<span className="min-w-0 truncate text-sm font-bold text-slate-100">
												{resolveActionName(entry.mine.actionCode)}
											</span>
										</div>
										<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
											<span className={TONE_TEXT[mineOutcome.tone]}>
												{mineOutcome.label}
											</span>
											{site && (
												<span className="text-slate-400">روی {site}</span>
											)}
											{entry.mine.appliedProbability !== null && (
												<span className="inline-flex items-center gap-1 tabular-nums text-slate-400">
													<Dices className="size-3" />
													{faNumber(Math.round(entry.mine.appliedProbability))}٪
													{entry.mine.roll !== null &&
														` · تاس ${faNumber(Math.round(entry.mine.roll))}`}
												</span>
											)}
											{entry.mine.guardActive && (
												<span className="inline-flex items-center gap-1 text-cyan-200">
													<ShieldCheck className="size-3" /> سد برقرار
												</span>
											)}
										</div>
										{entry.mine.counterActionCode !== null && (
											<div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-5 text-sky-100/70">
												<ShieldAlert className="mt-0.5 size-3 shrink-0" />
												<span>
													پادکنش «
													{resolveActionName(entry.mine.counterActionCode)}»{" "}
													{entry.mine.counterEffectiveness !== null &&
														`${faNumber(Math.round(entry.mine.counterEffectiveness))}٪ `}
													{entry.mine.blockedByCounter
														? "گرفت و حرکت شما تاس نریخت"
														: "نگرفت"}
												</span>
											</div>
										)}
									</>
								) : (
									<div className="mt-1 text-sm text-slate-600">
										حرکتی ثبت نشد
									</div>
								)}
							</div>

							<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
								<div className="flex items-center gap-1.5 text-[11px] text-slate-400">
									<Swords className="size-3" /> تیم مقابل
								</div>
								{entry.theirs ? (
									<>
										<div className="mt-1 flex items-center gap-2">
											<span
												className={`size-2 shrink-0 rounded-full ${TONE_DOT[theirsOutcome.tone]}`}
											/>
											<span className="min-w-0 truncate text-sm font-bold text-slate-100">
												{resolveActionName(entry.theirs.actionCode)}
											</span>
										</div>
										<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
											<span className={TONE_TEXT[theirsOutcome.tone]}>
												{theirsOutcome.label}
											</span>
											<span className="text-slate-500">
												{entry.theirs.role === "target"
													? "روی تیم شما"
													: "در زمین خودشان"}
											</span>
											{entry.theirs.appliedProbability !== null && (
												<span className="inline-flex items-center gap-1 tabular-nums text-slate-400">
													<Dices className="size-3" />
													{faNumber(
														Math.round(entry.theirs.appliedProbability),
													)}
													٪
													{entry.theirs.roll !== null &&
														` · تاس ${faNumber(Math.round(entry.theirs.roll))}`}
												</span>
											)}
										</div>
									</>
								) : (
									<div className="mt-1 text-sm text-slate-600">
										گزارشی از این نوبت نرسید
									</div>
								)}
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}
