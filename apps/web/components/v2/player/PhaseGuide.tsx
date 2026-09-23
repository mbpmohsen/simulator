"use client";

import type { GamePhase } from "@workspace/trpc";
import { useReducedMotion } from "framer-motion";
import { Clock3, Crosshair, Gavel, Hourglass, Vote } from "lucide-react";
import { formatPhaseFa } from "@/lib/runtimeTranslationsFa";

/**
 * One line telling the team what this phase wants from them, with the clock.
 *
 * The board used to show the phase as a label and nothing else, so a player
 * had to already know what "انتخاب مسیر" expects. The clock is the other half:
 * a turn is 110 seconds and nothing on the screen said so.
 */

export interface PhaseGuideProps {
	phase: GamePhase;
	turn: number | null;
	totalTurns: number | null;
	secondsLeft: number | null;
	totalSeconds: number | null;
	/** True once a target is active, which changes what the team should do. */
	hasTarget: boolean;
	/** True once this player's vote is in. */
	hasVoted: boolean;
}

const faNumber = (value: number): string => value.toLocaleString("fa-IR");

const PHASE_ICON: Record<string, typeof Vote> = {
	GOVERNMENT_SELECTION: Gavel,
	SELECTION: Crosshair,
	VOTING: Vote,
	CALCULATION: Hourglass,
};

const guidance = (
	phase: GamePhase,
	hasTarget: boolean,
	hasVoted: boolean,
): string => {
	switch (phase) {
		case "GOVERNMENT_SELECTION":
			return "دولت دارد دستور این نوبت را صادر می‌کند. تا آمدن دستور کاری لازم نیست.";
		case "SELECTION":
			return hasTarget
				? "هدف این نوبت انتخاب شده است. اگر نظرتان عوض شد، تا پایان این فاز می‌توانید هدف دیگری بردارید."
				: "یک هدف انتخاب کنید تا حرکت‌های روی آن باز شود.";
		case "VOTING":
			return hasVoted
				? "رأی شما ثبت شد. تصمیم تیم با اکثریت آرا بسته می‌شود."
				: "روی یکی از حرکت‌ها رأی بدهید. حریف هم همین حالا دارد تصمیم می‌گیرد و انتخابش را نمی‌بینید.";
		case "CALCULATION":
			return "رأی‌ها بسته شد. نتیجهٔ هر دو تیم دارد محاسبه می‌شود.";
		default:
			return "";
	}
};

export function PhaseGuide({
	phase,
	turn,
	totalTurns,
	secondsLeft,
	totalSeconds,
	hasTarget,
	hasVoted,
}: PhaseGuideProps) {
	const reduceMotion = useReducedMotion();
	const Icon = PHASE_ICON[phase] ?? Clock3;
	const urgent = secondsLeft !== null && secondsLeft <= 10 && secondsLeft > 0;
	const ratio =
		secondsLeft !== null && totalSeconds
			? Math.max(0, Math.min(1, secondsLeft / totalSeconds))
			: null;

	return (
		<section
			className={`rounded-2xl border p-4 ${urgent ? "border-orange-400/40 bg-orange-500/[0.09]" : "border-cyan-400/20 bg-cyan-500/[0.06]"}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<span
						className={`grid size-10 shrink-0 place-items-center rounded-xl border ${urgent ? "border-orange-400/30 bg-orange-400/15 text-orange-200" : "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"}`}
					>
						<Icon className="size-5" />
					</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
							<span className="font-black text-slate-200">
								{formatPhaseFa(phase)}
							</span>
							{turn !== null && (
								<span className="tabular-nums">
									نوبت {faNumber(turn)}
									{totalTurns ? ` از ${faNumber(totalTurns)}` : ""}
								</span>
							)}
						</div>
						<p className="mt-1 text-sm leading-6 text-slate-200">
							{guidance(phase, hasTarget, hasVoted)}
						</p>
					</div>
				</div>

				{secondsLeft !== null && (
					<div
						className={`flex items-center gap-2 rounded-xl border px-3 py-2 tabular-nums ${urgent ? "border-orange-400/30 bg-orange-400/10 text-orange-100" : "border-white/10 bg-black/25 text-slate-200"}`}
						aria-live={urgent ? "polite" : "off"}
					>
						<Clock3
							className={`size-4 ${urgent && !reduceMotion ? "animate-pulse" : ""}`}
						/>
						<span className="text-lg font-black">{faNumber(secondsLeft)}</span>
						<span className="text-[11px] text-slate-400">ثانیه</span>
					</div>
				)}
			</div>

			{ratio !== null && (
				<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/35">
					<div
						className={`h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none ${urgent ? "bg-orange-400" : "bg-cyan-400"}`}
						style={{ width: `${ratio * 100}%` }}
					/>
				</div>
			)}
		</section>
	);
}
