"use client";

import { Button } from "@workspace/ui/components/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	CheckCircle2,
	Coins,
	Dices,
	Gauge,
	ShieldAlert,
	ShieldCheck,
	ShieldHalf,
	Swords,
	Target,
	TrendingUp,
	TriangleAlert,
	Trophy,
	X,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { IncomingMove, MoveResult } from "@/lib/moveResults";
import { playNotificationSound } from "@/lib/playNotificationSound";
import {
	type OutcomeTone,
	outcomeWordingFa,
} from "@/lib/runtimeTranslationsFa";

/** Semantic colour for a verdict, separate from the card accent. */
const TONE_BOX: Record<OutcomeTone, string> = {
	success: "border-emerald-400/30 bg-emerald-500/[0.10]",
	failure: "border-orange-400/30 bg-orange-500/[0.09]",
	blocked: "border-sky-400/30 bg-sky-500/[0.10]",
	neutral: "border-cyan-400/25 bg-cyan-500/[0.08]",
};

const TONE_TEXT: Record<OutcomeTone, string> = {
	success: "text-emerald-200",
	failure: "text-orange-200",
	blocked: "text-sky-200",
	neutral: "text-cyan-200",
};

/**
 * The beat between locking a decision and finding out what it did.
 *
 * Both teams lock before anything resolves, so this opens only once the turn's
 * result has arrived and nothing here can influence the vote that produced it.
 *
 * It shows three things in order: the move this team played, the move the
 * opponent played, and how it went.
 *
 * Since the 2026-09-24 server both sides are told what the other played - the
 * defender through `role: "target"`, the attacker through `role: "counterparty"`
 * - and every resolution carries the probability actually rolled, the roll, and
 * the counter that gated it. The verdict is worded from `outcomeReason`, never
 * from the bare success flag: a defence that never rolled is not a failure.
 */

export interface TurnRevealProps {
	open: boolean;
	turn: number | null;
	result: MoveResult;
	/** Persian name of the move this team played. */
	moveName: string;
	/** Persian name of the site it ran against, when known. */
	siteName: string | null;
	/** Base success chance of that move, from the action catalogue. */
	probability: number | null;
	cost: number | null;
	/** Persian name of the counter the server says gated this move, if any. */
	counterName: string | null;
	/** The opponent's move, when the server reports it to this team. */
	opponent: IncomingMove | null;
	/** Persian name of the opponent's move. */
	opponentMoveName: string | null;
	onClose: () => void;
}

const faNumber = (value: number, digits = 0): string =>
	value.toLocaleString("fa-IR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

export function TurnRevealOverlay({
	open,
	turn,
	result,
	moveName,
	siteName,
	probability,
	cost,
	counterName,
	opponent,
	opponentMoveName,
	onClose,
}: TurnRevealProps) {
	const reduceMotion = useReducedMotion();
	const [stage, setStage] = useState(0);

	// Three beats: your card, their card, the verdict. Without the pause the
	// result lands before the player has read what they were up against.
	useEffect(() => {
		if (!open) {
			setStage(0);
			return;
		}
		playNotificationSound();
		if (reduceMotion) {
			setStage(3);
			return;
		}
		const timers = [
			window.setTimeout(() => setStage(1), 180),
			window.setTimeout(() => setStage(2), 900),
			window.setTimeout(() => setStage(3), 1700),
		];
		return () => {
			for (const timer of timers) window.clearTimeout(timer);
		};
	}, [open, reduceMotion]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const success = result.success;
	const verdict = outcomeWordingFa(result.outcomeReason, success);
	const opponentVerdict = outcomeWordingFa(
		opponent?.outcomeReason,
		opponent?.success === true,
	);
	// No longer a guess: the server names the counter that gated this move and
	// says whether its gate rolled through.
	const gated = result.counterActionCode !== null;

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					dir="rtl"
					className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					aria-label="نتیجهٔ این نوبت"
					onClick={onClose}
				>
					<motion.section
						initial={reduceMotion ? false : { scale: 0.96, y: 12 }}
						animate={{ scale: 1, y: 0 }}
						transition={{ type: "spring", stiffness: 260, damping: 24 }}
						onClick={(event) => event.stopPropagation()}
						className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1224] p-5 shadow-2xl sm:p-6"
					>
						<header className="mb-4 flex items-start justify-between gap-3">
							<div>
								<div className="text-[11px] text-slate-400">
									{turn === null
										? "نتیجهٔ این نوبت"
										: `نتیجهٔ نوبت ${faNumber(turn)}`}
								</div>
								<h2 className="mt-0.5 text-lg font-black text-slate-100">
									کارت‌ها رو شد
								</h2>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={onClose}
								aria-label="بستن"
								className="text-slate-400 hover:text-slate-100"
							>
								<X className="size-5" />
							</Button>
						</header>

						<div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
							<motion.div
								initial={reduceMotion ? false : { opacity: 0, rotateY: 70 }}
								animate={stage >= 1 ? { opacity: 1, rotateY: 0 } : {}}
								transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
								className="rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,.14),rgba(15,23,42,.6))] p-4"
							>
								<div className="text-[11px] text-cyan-200/80">تیم شما</div>
								<div className="mt-1 break-words text-base font-black text-slate-100">
									{moveName}
								</div>
								<div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
									{siteName && (
										<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 text-slate-300">
											<Target className="size-3" /> روی {siteName}
										</span>
									)}
									{(result.appliedProbability ?? probability) !== null && (
										<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 tabular-nums text-slate-300">
											<Gauge className="size-3" /> شانس{" "}
											{faNumber(
												Math.round(
													(result.appliedProbability ?? probability) as number,
												),
											)}
											٪
										</span>
									)}
									{result.roll !== null && (
										<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 tabular-nums text-slate-300">
											<Dices className="size-3" /> تاس{" "}
											{faNumber(Math.round(result.roll))}
										</span>
									)}
								</div>
							</motion.div>

							<div className="grid place-items-center text-xs font-black text-slate-500 sm:px-1">
								در برابر
							</div>

							<motion.div
								initial={reduceMotion ? false : { opacity: 0, rotateY: -70 }}
								animate={stage >= 2 ? { opacity: 1, rotateY: 0 } : {}}
								transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
								className={`rounded-2xl border p-4 ${opponent ? "border-sky-400/25 bg-[linear-gradient(135deg,rgba(56,189,248,.14),rgba(15,23,42,.6))]" : "border-dashed border-white/12 bg-white/[0.02]"}`}
							>
								<div className="text-[11px] text-sky-200/80">تیم حریف</div>
								{opponent ? (
									<>
										<div className="mt-1 break-words text-base font-black text-slate-100">
											{opponentMoveName ?? "یک حرکت"}
										</div>
										<div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
											<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 text-slate-300">
												<Swords className="size-3" />
												{opponent.role === "target"
													? "روی تیم شما"
													: "در زمین خودشان"}
											</span>
											<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 text-slate-300">
												{opponentVerdict.label}
											</span>
											{opponent.appliedProbability !== null && (
												<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-0.5 tabular-nums text-slate-300">
													<Gauge className="size-3" /> شانس{" "}
													{faNumber(Math.round(opponent.appliedProbability))}٪
												</span>
											)}
											{opponent.guardActive && (
												<span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-cyan-100">
													<ShieldCheck className="size-3" /> سدشان برقرار بود
												</span>
											)}
										</div>
									</>
								) : (
									<>
										<div className="mt-1 text-base font-black text-slate-400">
											حرکتی گزارش نشد
										</div>
										<p className="mt-2 text-[11px] leading-6 text-slate-500">
											این نوبت چیزی از سمت حریف به تیم شما نرسید — یا حرکتی
											نکردند، یا حرکتشان به تیم شما مربوط نبود.
										</p>
									</>
								)}
							</motion.div>
						</div>

						<motion.div
							initial={reduceMotion ? false : { opacity: 0, y: 10 }}
							animate={stage >= 3 ? { opacity: 1, y: 0 } : {}}
							transition={{ type: "spring", stiffness: 280, damping: 22 }}
							className={`mt-4 rounded-2xl border p-4 ${TONE_BOX[verdict.tone]}`}
						>
							<div
								className={`flex items-center gap-2 text-lg font-black ${TONE_TEXT[verdict.tone]}`}
							>
								{verdict.tone === "success" ? (
									<CheckCircle2 className="size-5" />
								) : verdict.tone === "blocked" ? (
									<ShieldAlert className="size-5" />
								) : verdict.tone === "neutral" ? (
									<ShieldCheck className="size-5" />
								) : (
									<XCircle className="size-5" />
								)}
								{verdict.label}
							</div>
							<p className="mt-1 text-xs leading-6 text-slate-300">
								{verdict.detail}
							</p>

							<div className="mt-2 flex flex-wrap gap-2 text-[11px]">
								{success && result.progress !== null && (
									<span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-100">
										<TrendingUp className="size-3" />{" "}
										{faNumber(result.progress)} واحد پیشرفت
										{siteName ? ` روی ${siteName}` : ""}
									</span>
								)}
								{success && result.points !== null && result.points > 0 && (
									<span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-400/10 px-2 py-1 text-violet-100">
										<Trophy className="size-3" /> {faNumber(result.points)}{" "}
										امتیاز
									</span>
								)}
								{!success &&
									cost !== null &&
									result.outcomeReason !== "INSUFFICIENT_CREDITS" &&
									result.outcomeReason !== "INVALID" && (
										<span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-100">
											<Coins className="size-3" /> {faNumber(cost)} اعتبار خرج
											شد
										</span>
									)}
								{result.subjectProgress !== null && (
									<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-slate-400">
										پیشرفت کل مأموریت {faNumber(result.subjectProgress)}٪
									</span>
								)}
							</div>

							{/* The counter is a gate, not a discount: it rolls before the
							    move and either stops it outright or lets it through at
							    full strength. Showing both numbers is the only way the
							    player learns that. */}
							{gated && (
								<p className="mt-3 flex items-start gap-1.5 text-[11px] leading-6 text-sky-100/80">
									<ShieldHalf className="mt-1 size-3 shrink-0 text-sky-300" />
									<span>
										حریف پادکنش این حرکت را بازی کرده بود
										{counterName ? ` («${counterName}»)` : ""}
										{result.counterEffectiveness !== null && (
											<>
												{" "}
												(شانس سدکردن{" "}
												{faNumber(Math.round(result.counterEffectiveness))}٪
												{result.counterRoll !== null && (
													<>، تاسش {faNumber(Math.round(result.counterRoll))}</>
												)}
												)
											</>
										)}
										.{" "}
										{result.blockedByCounter
											? "سد گرفت و حرکت شما اصلاً تاس نریخت."
											: "سد نگرفت، پس حرکت شما با شانس کامل خودش رفت."}
									</span>
								</p>
							)}

							{result.outcomeReason === "TARGET_VULNERABLE" && (
								<p className="mt-3 flex items-start gap-1.5 text-[11px] leading-6 text-amber-100/90">
									<TriangleAlert className="mt-1 size-3 shrink-0 text-amber-300" />
									<span>
										هدف از ضربهٔ قبلی هنوز ترمیم نشده بود، پس این حرکت بدون تاس
										نشست. تا وقتی ترمیم نکنند، همین حرکت باز هم با اطمینان کامل
										می‌گیرد.
									</span>
								</p>
							)}

							{result.guardActive &&
								result.guardsAgainstActionCode !== null &&
								result.outcomeReason === "NOTHING_TO_REPAIR" && (
									<p className="mt-3 flex items-start gap-1.5 text-[11px] leading-6 text-cyan-100/85">
										<ShieldCheck className="mt-1 size-3 shrink-0 text-cyan-300" />
										<span>
											این دفاع تمام نوبت سد بود؛ فقط چیزی برای ترمیم وجود نداشت.
											«ناموفق» نبود.
										</span>
									</p>
								)}
						</motion.div>

						<div className="mt-4 flex justify-end">
							<Button
								onClick={onClose}
								className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
							>
								ادامهٔ بازی
							</Button>
						</div>
					</motion.section>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
