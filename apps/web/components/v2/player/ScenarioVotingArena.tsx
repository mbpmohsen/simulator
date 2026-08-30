"use client";

import type { GamePhase, PlayerSchema, StepView } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	Activity,
	Check,
	CheckCircle2,
	CircleDot,
	Coins,
	Crown,
	Gauge,
	Hourglass,
	Layers,
	LoaderCircle,
	LockKeyhole,
	Radio,
	Scale,
	ShieldAlert,
	Sparkles,
	Trophy,
	Users,
	Vote,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { playClickSound } from "@/lib/playClickSound";
import { playNotificationSound } from "@/lib/playNotificationSound";
import {
	formatActionCodeFa,
	formatPhaseFa,
	formatStepStatusFa,
} from "@/lib/runtimeTranslationsFa";

/**
 * What the player already knows about an action from `/client/game_state`.
 * The steps endpoint may omit the name, cost and probability, so we join on the
 * action code and fill the gaps rather than falling back to a raw code.
 */
export interface ArenaActionInfo {
	code: string;
	name?: string | null;
	nameFa?: string | null;
	cost?: number | null;
	probability?: number | null;
	points?: number | null;
}

interface ScenarioVotingArenaProps {
	steps: StepView[];
	phase: GamePhase;
	currentTurn: number | null;
	gameId: string | null;
	scenarioId: string;
	currentUserId: number | null;
	teamMembers: PlayerSchema[];
	actionBusy: string | null;
	actionCatalog?: ArenaActionInfo[];
	loading?: boolean;
	error?: string | null;
	onVote: (stepId: string) => Promise<boolean>;
	onInspectLocks: (stepId: string) => void | Promise<void>;
}

const stepTone: Record<StepView["status"], string> = {
	available:
		"border-cyan-400/20 bg-[linear-gradient(135deg,rgba(6,182,212,.1),rgba(15,23,42,.72)_55%)]",
	completed:
		"border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,.14),rgba(15,23,42,.72)_55%)]",
	failed:
		"border-rose-400/30 bg-[linear-gradient(135deg,rgba(244,63,94,.13),rgba(15,23,42,.72)_55%)]",
	locked: "border-white/8 bg-white/[0.025]",
};

const riskLabel = (probability: number): string => {
	if (probability >= 70) return "شانس بالا";
	if (probability >= 45) return "شانس متوسط";
	return "ریسک بالا";
};

/**
 * One plain-Persian sentence per move, for an audience that has never seen a
 * payoff matrix. Derived from the numbers so it stays true if they are retuned.
 */
const tradeoffHintFa = (
	probability: number | null,
	points: number | null,
): string | null => {
	if (probability === null) return null;
	if (probability >= 70) {
		return points !== null && points <= 1
			? "کم‌ریسک: تقریباً همیشه می‌گیرد، اما هر بار فقط کمی جلو می‌برد."
			: "کم‌ریسک: تقریباً همیشه می‌گیرد.";
	}
	if (probability < 45) {
		return points !== null && points >= 3
			? "پرریسک: بیشتر وقت‌ها شکست می‌خورد، اما وقتی بگیرد بُرد بزرگی است."
			: "پرریسک: بیشتر وقت‌ها شکست می‌خورد.";
	}
	return "میانه: نه بهترین شانس، نه بزرگ‌ترین بُرد.";
};

const initials = (name: string): string => {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "؟";
	return parts
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
};

const voteStorageKey = ({
	gameId,
	userId,
	turn,
	scenarioId,
}: {
	gameId: string | null;
	userId: number | null;
	turn: number | null;
	scenarioId: string;
}): string | null => {
	if (!gameId || userId === null || turn === null) return null;
	return `simulator-player-vote:${gameId}:${userId}:${turn}:${scenarioId}`;
};

const firstNumber = (
	...values: Array<number | null | undefined>
): number | null => {
	for (const value of values) {
		if (typeof value === "number" && Number.isFinite(value)) return value;
	}
	return null;
};

/**
 * A plan can offer the same action once per turn, which arrives as several
 * identical steps. Players should see one card per move, not one per turn.
 */
interface MoveGroup {
	code: string;
	label: string;
	order: number;
	steps: StepView[];
	nextStep: StepView | null;
	remaining: number;
	succeeded: number;
	failed: number;
	required: boolean;
	status: StepView["status"];
	cost: number | null;
	probability: number | null;
	points: number | null;
	expectedValue: number | null;
	hint: string | null;
}

const faNumber = (value: number, digits = 0): string =>
	value.toLocaleString("fa-IR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

export function ScenarioVotingArena({
	steps,
	phase,
	currentTurn,
	gameId,
	scenarioId,
	currentUserId,
	teamMembers,
	actionBusy,
	actionCatalog,
	loading = false,
	error,
	onVote,
	onInspectLocks,
}: ScenarioVotingArenaProps) {
	const reduceMotion = useReducedMotion();
	const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
	const [submittedStepId, setSubmittedStepId] = useState<string | null>(null);
	const storageKey = voteStorageKey({
		gameId,
		userId: currentUserId,
		turn: currentTurn,
		scenarioId,
	});
	const resolvedSteps = steps.filter(
		(step) => step.status === "completed" || step.status === "failed",
	).length;
	const missionProgress =
		steps.length > 0 ? Math.round((resolvedSteps / steps.length) * 100) : 0;
	const onlineMembers = teamMembers.filter(
		(member) => member.connected === true,
	);
	const votingOpen = phase === "VOTING";
	const calculating = phase === "CALCULATION";

	const catalogByCode = useMemo(() => {
		const map = new Map<string, ArenaActionInfo>();
		for (const entry of actionCatalog ?? []) map.set(entry.code, entry);
		return map;
	}, [actionCatalog]);

	const groups = useMemo<MoveGroup[]>(() => {
		const byCode = new Map<string, StepView[]>();
		for (const step of steps) {
			const bucket = byCode.get(step.action_code);
			if (bucket) bucket.push(step);
			else byCode.set(step.action_code, [step]);
		}

		const built: MoveGroup[] = [];
		for (const [code, bucket] of byCode) {
			const ordered = [...bucket].sort(
				(left, right) => (left.order ?? 0) - (right.order ?? 0),
			);
			const info = catalogByCode.get(code);
			// Persian first, then any English name, then a readable form of the code.
			// The steps endpoint may omit names entirely, so the game-state catalog
			// backs it up and a bare action code can never reach the screen.
			const pick = (
				...values: Array<string | null | undefined>
			): string | null => {
				for (const value of values) {
					const text = value?.trim();
					if (text && text !== "—" && text !== code) return text;
				}
				return null;
			};
			const resolvedLabel =
				pick(
					...ordered.map((step) => step.action_name_fa),
					info?.nameFa,
					...ordered.map((step) => step.action_name),
					info?.name,
				) ?? formatActionCodeFa(code);

			const open = ordered.filter(
				(step) => step.status !== "completed" && step.status !== "failed",
			);
			const nextStep = open.find((step) => step.available) ?? open[0] ?? null;
			const cost = firstNumber(
				...ordered.map((step) => step.cost),
				info?.cost,
			);
			const probability = firstNumber(
				...ordered.map((step) => step.probability),
				info?.probability,
			);
			const points = firstNumber(info?.points);

			built.push({
				code,
				label: resolvedLabel,
				order: ordered[0]?.order ?? 0,
				steps: ordered,
				nextStep,
				remaining: open.length,
				succeeded: ordered.filter((step) => step.status === "completed").length,
				failed: ordered.filter((step) => step.status === "failed").length,
				required: ordered.some((step) => step.required),
				status: nextStep?.status ?? ordered[ordered.length - 1]?.status ?? "locked",
				cost,
				probability,
				points,
				expectedValue:
					probability !== null && points !== null
						? (probability / 100) * points
						: null,
				hint: tradeoffHintFa(probability, points),
			});
		}
		return built.sort((left, right) => left.order - right.order);
	}, [steps, catalogByCode]);

	// Only worth explaining the mixing idea when there is actually a choice.
	const showMixingHint = groups.length >= 2;
	const equalExpectedValue =
		groups.length >= 2 &&
		groups.every((group) => group.expectedValue !== null) &&
		Math.max(...groups.map((group) => group.expectedValue ?? 0)) -
			Math.min(...groups.map((group) => group.expectedValue ?? 0)) <
			0.05;

	useEffect(() => {
		setSelectedStepId(null);
		if (!storageKey) {
			setSubmittedStepId(null);
			return;
		}
		setSubmittedStepId(window.sessionStorage.getItem(storageKey));
	}, [storageKey]);

	const activeMembers = useMemo(
		() =>
			[...teamMembers].sort((left, right) => {
				if (left.id === currentUserId && right.id !== currentUserId) return -1;
				if (right.id === currentUserId && left.id !== currentUserId) return 1;
				return (
					Number(right.connected === true) - Number(left.connected === true)
				);
			}),
		[currentUserId, teamMembers],
	);

	const selectStep = (step: StepView | null) => {
		if (
			!step ||
			!votingOpen ||
			!step.available ||
			actionBusy !== null ||
			submittedStepId !== null
		) {
			return;
		}
		playClickSound();
		setSelectedStepId(step.id);
	};

	const submitVote = async (stepId: string) => {
		playClickSound();
		const accepted = await onVote(stepId);
		if (!accepted) return;
		setSubmittedStepId(stepId);
		setSelectedStepId(null);
		if (storageKey) window.sessionStorage.setItem(storageKey, stepId);
		playNotificationSound();
	};

	return (
		<Card className="overflow-hidden border-white/10 bg-slate-950/60 text-slate-100 shadow-2xl shadow-cyan-950/10">
			<CardHeader className="relative border-b border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.13),transparent_40%)] pb-5">
				<motion.div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 -right-1/3 w-1/2 bg-gradient-to-l from-transparent via-cyan-300/5 to-transparent"
					animate={reduceMotion ? undefined : { x: ["0%", "280%"] }}
					transition={{
						duration: 5,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
				<div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<CardTitle className="flex items-center gap-2 text-lg font-black">
								<Vote className="size-5 text-cyan-300" /> مرکز تصمیم عملیاتی
							</CardTitle>
							<Badge className="border border-violet-400/20 bg-violet-500/15 text-violet-100">
								<CircleDot className="size-3" /> {formatPhaseFa(phase)}
							</Badge>
						</div>
						<p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
							این نوبت فقط یک حرکت انتخاب می‌کنید. هزینه و شانس موفقیت هر حرکت
							روی کارت آن نوشته شده است. نتیجه در فاز محاسبه مشخص می‌شود.
						</p>
					</div>

					<div className="flex min-w-fit items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3">
						<div className="flex -space-x-2 space-x-reverse" dir="rtl">
							{activeMembers.slice(0, 5).map((member) => (
								<div
									key={member.id}
									title={`${member.name}${member.connected ? " — آنلاین" : " — آفلاین"}`}
									className={`relative grid size-9 place-items-center rounded-full border-2 border-slate-950 text-[10px] font-black ${member.connected ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-500"}`}
								>
									{initials(member.name)}
									{(member.isLeader === true || member.is_leader === true) && (
										<Crown className="absolute -top-2 size-3 fill-amber-300 text-amber-300" />
									)}
									<span
										className={`absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-slate-950 ${member.connected ? "bg-emerald-400" : "bg-slate-600"}`}
									/>
								</div>
							))}
						</div>
						<div>
							<div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
								<Users className="size-3.5 text-cyan-300" /> آمادگی تیم
							</div>
							<div className="mt-1 text-[11px] text-slate-500">
								{teamMembers.length > 0
									? `${onlineMembers.length.toLocaleString("fa-IR")} عضو آنلاین از ${teamMembers.length.toLocaleString("fa-IR")}`
									: "اطلاعات اعضای تیم در دسترس نیست"}
							</div>
						</div>
					</div>
				</div>

				<div className="relative mt-5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
					<Progress value={missionProgress} className="h-1.5 bg-white/5" />
					<div className="text-[11px] text-slate-500">
						{resolvedSteps.toLocaleString("fa-IR")} از{" "}
						{steps.length.toLocaleString("fa-IR")} فرصت حرکت مصرف شده
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4 p-4 sm:p-5">
				{error && (
					<div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
						{error}
					</div>
				)}
				{loading && steps.length === 0 && (
					<div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
						<div className="text-center text-xs text-slate-500">
							<LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-cyan-300" />
							در حال دریافت حرکت‌های این مسیر...
						</div>
					</div>
				)}
				{!loading && !error && steps.length === 0 && (
					<div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
						برای این مسیر هنوز حرکت قابل نمایشی وجود ندارد.
					</div>
				)}

				<AnimatePresence mode="wait">
					{submittedStepId && votingOpen ? (
						<motion.div
							key="submitted"
							initial={{ opacity: 0, scale: 0.98 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, y: -6 }}
							className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4"
						>
							<motion.div
								aria-hidden="true"
								className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-emerald-200/10 to-transparent"
								animate={reduceMotion ? undefined : { x: ["-150%", "900%"] }}
								transition={{
									duration: 2.8,
									repeat: Number.POSITIVE_INFINITY,
									repeatDelay: 1.5,
								}}
							/>
							<div className="relative flex items-center gap-3">
								<div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
									<Check className="size-5 stroke-[3]" />
								</div>
								<div>
									<div className="font-black text-emerald-100">
										تصمیم شما قفل شد
									</div>
									<div className="mt-1 text-xs text-emerald-200/65">
										منتظر جمع‌بندی تصمیم تیم و ورود به فاز محاسبه باشید.
									</div>
								</div>
							</div>
						</motion.div>
					) : calculating ? (
						<motion.div
							key="calculating"
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4"
						>
							<div className="flex items-center gap-3">
								<div className="relative grid size-11 place-items-center rounded-full border border-violet-300/25 bg-violet-400/10">
									<motion.span
										className="absolute inset-1 rounded-full border border-violet-300/30 border-t-transparent"
										animate={reduceMotion ? undefined : { rotate: 360 }}
										transition={{
											duration: 1.4,
											repeat: Number.POSITIVE_INFINITY,
											ease: "linear",
										}}
									/>
									<Activity className="size-4 text-violet-200" />
								</div>
								<div>
									<div className="font-black text-violet-100">
										تحلیل عملیات در جریان است
									</div>
									<div className="mt-1 text-xs text-violet-200/60">
										مرکز فرماندهی در حال محاسبه نتیجه تصمیم تیم است.
									</div>
								</div>
							</div>
						</motion.div>
					) : votingOpen ? (
						<motion.div
							key="voting"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200"
						>
							<Radio className="size-3.5 animate-pulse" /> کانال رأی‌گیری باز
							است؛ یکی از حرکت‌های زیر را انتخاب کنید.
						</motion.div>
					) : (
						<motion.div
							key="closed"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-200"
						>
							<Hourglass className="size-3.5" /> رأی‌گیری در فاز{" "}
							{formatPhaseFa(phase)} بسته است.
						</motion.div>
					)}
				</AnimatePresence>

				{showMixingHint && (
					<div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-xs leading-6 text-slate-400">
						<div className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-300">
							<Scale className="size-3.5 text-cyan-300" /> چطور انتخاب کنم؟
						</div>
						{equalExpectedValue ? (
							<>
								اگر فقط به «ارزش مورد انتظار» نگاه کنید، هر سه حرکت تقریباً
								یکسان‌اند: حرکت ارزان تقریباً همیشه می‌گیرد ولی کم می‌ارزد و
								حرکت گران کم می‌گیرد ولی زیاد می‌ارزد. پس آنچه تعیین‌کننده است،
								<span className="font-bold text-slate-200">
									{" "}
									انتخاب تیم مقابل است
								</span>
								؛ و اگر هر نوبت یک حرکت را تکرار کنید، حریف شما را می‌خواند و
								دقیقاً همان را خنثی می‌کند.
							</>
						) : (
							<>
								حرکت ارزان‌تر شانس بیشتری دارد ولی کمتر می‌ارزد و حرکت گران‌تر
								برعکس. اگر هر نوبت یک حرکت را تکرار کنید، حریف شما را می‌خواند
								و دقیقاً همان را خنثی می‌کند؛ پس جابه‌جا شدن میان حرکت‌ها
								بخشی از بازی است.
							</>
						)}
					</div>
				)}

				<div className="grid gap-3">
					{groups.map((group, index) => {
						const nextStep = group.nextStep;
						const exhausted = group.remaining === 0;
						const submitted =
							submittedStepId !== null &&
							group.steps.some((step) => step.id === submittedStepId);
						const selected =
							nextStep !== null && selectedStepId === nextStep.id && !submitted;
						const locked =
							!exhausted && (nextStep === null || !nextStep.available);
						const canSelect =
							votingOpen && !locked && !exhausted && !submittedStepId;
						return (
							<motion.article
								layout
								key={group.code}
								initial={reduceMotion ? false : { opacity: 0, y: 10 }}
								animate={{
									opacity:
										submittedStepId && !submitted && !exhausted ? 0.52 : 1,
									y: 0,
									scale: selected ? 1.012 : 1,
								}}
								transition={{
									delay: reduceMotion ? 0 : index * 0.045,
									type: "spring",
									stiffness: 260,
									damping: 24,
								}}
								className={`group relative overflow-hidden rounded-2xl border p-4 transition-colors sm:p-5 ${stepTone[group.status]} ${selected ? "border-cyan-300/60 ring-1 ring-cyan-300/25 shadow-[0_0_34px_rgba(34,211,238,.13)]" : ""} ${submitted ? "border-emerald-300/60 ring-1 ring-emerald-300/20 shadow-[0_0_36px_rgba(52,211,153,.14)]" : ""}`}
							>
								{selected && (
									<motion.div
										layoutId="selected-operation-glow"
										className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(34,211,238,.15),transparent_42%)]"
									/>
								)}
								<div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
									<button
										type="button"
										onClick={() => selectStep(nextStep)}
										disabled={!canSelect || actionBusy !== null}
										className="min-w-0 flex-1 text-right disabled:cursor-default"
									>
										<div className="flex items-start gap-3.5">
											<div
												className={`relative grid size-12 shrink-0 place-items-center rounded-2xl border font-black ${submitted ? "border-emerald-300/30 bg-emerald-400 text-slate-950" : selected ? "border-cyan-300/30 bg-cyan-400 text-slate-950" : "border-white/8 bg-black/25 text-slate-200"}`}
											>
												{submitted ? (
													<Check className="size-5 stroke-[3]" />
												) : (
													faNumber(index + 1)
												)}
												{canSelect && !selected && (
													<span className="absolute -inset-1 -z-10 rounded-2xl bg-cyan-400/0 transition-colors group-hover:bg-cyan-400/10" />
												)}
											</div>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="break-words font-black text-slate-100">
														{group.label}
													</h3>
													<Badge
														variant="secondary"
														className="bg-black/20 text-slate-300"
													>
														{submitted
															? "رأی ثبت‌شده"
															: exhausted
																? "فرصتی باقی نمانده"
																: formatStepStatusFa(group.status)}
													</Badge>
													{group.required && (
														<Badge className="border border-rose-400/15 bg-rose-500/15 text-rose-200">
															الزامی
														</Badge>
													)}
												</div>

												<div className="mt-3 flex flex-wrap gap-2">
													{group.probability !== null && (
														<span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/10 bg-cyan-400/5 px-2.5 py-1 text-[11px] text-cyan-100">
															<Gauge className="size-3" />{" "}
															{riskLabel(group.probability)} ·{" "}
															{faNumber(group.probability)}٪ شانس موفقیت
														</span>
													)}
													{group.cost !== null && (
														<span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/10 bg-amber-400/5 px-2.5 py-1 text-[11px] text-amber-100">
															<Coins className="size-3" /> هزینه{" "}
															{faNumber(group.cost)} اعتبار
														</span>
													)}
													{group.points !== null && (
														<span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/10 bg-violet-400/5 px-2.5 py-1 text-[11px] text-violet-100">
															<Trophy className="size-3" /> ارزش{" "}
															{faNumber(group.points)} امتیاز
														</span>
													)}
													{group.expectedValue !== null && (
														<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300">
															<Scale className="size-3" /> ارزش مورد انتظار{" "}
															{faNumber(group.expectedValue, 2)}
														</span>
													)}
													{group.steps.length > 1 && (
														<span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
															<Layers className="size-3" />{" "}
															{faNumber(group.remaining)} فرصت باقی‌مانده
														</span>
													)}
												</div>

												{group.hint && (
													<p className="mt-2.5 text-[11px] leading-6 text-slate-400">
														{group.hint}
													</p>
												)}

												{(group.succeeded > 0 || group.failed > 0) && (
													<p className="mt-1.5 text-[11px] text-slate-500">
														تاکنون {faNumber(group.succeeded)} بار موفق و{" "}
														{faNumber(group.failed)} بار ناموفق بوده است.
													</p>
												)}
											</div>
										</div>
									</button>

									<div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
										{locked && nextStep && (votingOpen || group.status === "locked") && (
											<Button
												variant="outline"
												onClick={() => void onInspectLocks(nextStep.id)}
												disabled={actionBusy !== null}
												className="border-white/10 bg-white/5 text-slate-300"
											>
												<LockKeyhole className="size-4" /> دلیل قفل
											</Button>
										)}

										{exhausted ? (
											<div
												className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold ${group.succeeded >= group.failed ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}
											>
												{group.succeeded >= group.failed ? (
													<CheckCircle2 className="size-4" />
												) : (
													<ShieldAlert className="size-4" />
												)}
												{faNumber(group.succeeded)} موفق از{" "}
												{faNumber(group.steps.length)}
											</div>
										) : submitted ? (
											<Button
												disabled
												className="bg-emerald-400/15 text-emerald-200 opacity-100"
											>
												<CheckCircle2 className="size-4" /> رأی شما قفل شد
											</Button>
										) : selected && nextStep ? (
											<motion.div
												initial={{ opacity: 0, x: -6 }}
												animate={{ opacity: 1, x: 0 }}
											>
												<Button
													onClick={() => void submitVote(nextStep.id)}
													disabled={!canSelect || actionBusy !== null}
													className="bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/15 hover:bg-cyan-200"
												>
													{actionBusy === `step-${nextStep.id}` ? (
														<LoaderCircle className="size-4 animate-spin" />
													) : (
														<Sparkles className="size-4" />
													)}
													قفل‌کردن تصمیم
												</Button>
											</motion.div>
										) : (
											<Button
												onClick={() => selectStep(nextStep)}
												disabled={!canSelect || actionBusy !== null}
												variant="outline"
												className="border-cyan-400/15 bg-cyan-400/5 text-cyan-100 hover:border-cyan-300/30 hover:bg-cyan-400/10"
											>
												<Vote className="size-4" /> انتخاب این حرکت
											</Button>
										)}
									</div>
								</div>

								<AnimatePresence>
									{selected && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											className="relative mt-4 overflow-hidden border-t border-cyan-300/15 pt-3 text-xs leading-6 text-cyan-100/70"
										>
											این انتخاب هنوز ثبت نشده است. برای تأیید نهایی، دکمه
											«قفل‌کردن تصمیم» را بزنید.
										</motion.div>
									)}
								</AnimatePresence>
							</motion.article>
						);
					})}
				</div>

				{groups.some((group) => group.expectedValue !== null) && (
					<p className="text-[11px] leading-6 text-slate-600">
						«ارزش مورد انتظار» یعنی شانس موفقیت ضربدر امتیاز آن حرکت — یعنی اگر
						آن حرکت را بارها بزنید، به‌طور میانگین چقدر امتیاز می‌گیرید.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
