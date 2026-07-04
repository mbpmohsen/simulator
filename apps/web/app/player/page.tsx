"use client";

import type {
	BlackMarketItemSchema,
	GamePhase,
	LockReason,
	OrderView,
	PlayerStateResponse,
	ScenarioView,
	StepView,
} from "@workspace/trpc";
import {
	canSelectScenario,
	canVoteStep,
	formatExecutionModeFa,
	formatLockReasonFa,
	formatOrderTypeFa,
	formatPhaseFa,
	formatScenarioTypeFa,
	formatStepStatusFa,
	getLocalized,
	parseApiError,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Progress } from "@workspace/ui/components/progress";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	CircleDollarSign,
	Clock3,
	Coins,
	Crosshair,
	Gauge,
	GitBranch,
	LoaderCircle,
	LockKeyhole,
	RefreshCw,
	ScrollText,
	ShieldAlert,
	ShoppingBag,
	Swords,
	Target,
	Vote,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CommunicationPanel } from "@/components/v2/CommunicationPanel";
import { GameEventFeed } from "@/components/v2/GameEventFeed";
import { useGameEvents } from "@/hooks/useGameEvents";
import { createLocalCommunicationService } from "@/lib/communicationService";
import { createSubjectScenarioApi } from "@/lib/subjectScenarioApi";
import { useAuthStore } from "@/store/auth.store";

const PHASES: GamePhase[] = [
	"GOVERNMENT_SELECTION",
	"SELECTION",
	"VOTING",
	"CALCULATION",
];

const isGamePhase = (value: unknown): value is GamePhase =>
	typeof value === "string" &&
	PHASES.includes(value.toUpperCase() as GamePhase);

const statusTone: Record<StepView["status"], string> = {
	available: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
	completed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
	failed: "border-rose-400/30 bg-rose-500/10 text-rose-100",
	locked: "border-slate-500/20 bg-slate-500/10 text-slate-300",
};

export default function PlayerDashboardPage() {
	const { token, user } = useAuthStore();
	const api = useMemo(() => createSubjectScenarioApi(token ?? ""), [token]);
	const [state, setState] = useState<PlayerStateResponse | null>(null);
	const [phase, setPhase] = useState<GamePhase>("GOVERNMENT_SELECTION");
	const [gameId, setGameId] = useState<string | null>(null);
	const [orders, setOrders] = useState<OrderView[]>([]);
	const [market, setMarket] = useState<BlackMarketItemSchema[]>([]);
	const [activeEffects, setActiveEffects] = useState<
		Array<{
			itemName?: string | null;
			effectType: string;
			turnsRemaining: number;
		}>
	>([]);
	const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
		null,
	);
	const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<
		string | null
	>(null);
	const [scenarios, setScenarios] = useState<ScenarioView[]>([]);
	const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
		null,
	);
	const [steps, setSteps] = useState<StepView[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionBusy, setActionBusy] = useState<string | null>(null);
	const [pageError, setPageError] = useState<string | null>(null);
	const [lockReasons, setLockReasons] = useState<LockReason[] | null>(null);
	const events = useGameEvents(gameId, token);

	const communicationService = useMemo(
		() =>
			createLocalCommunicationService({
				gameId: gameId ?? "active-game",
				senderUserId: user?.id ?? 0,
				senderTeamId: state?.team_id ?? 0,
				senderRole: "BOTH",
				turn: state?.current_turn ?? 0,
			}),
		[gameId, state?.current_turn, state?.team_id, user?.id],
	);

	const refresh = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setPageError(null);
		try {
			const playerState = await api.getPlayerState();
			setState(playerState);
			setSelectedSubjectId(
				(current) =>
					current ??
					playerState.active_subject_id ??
					playerState.assigned_subjects[0]?.id ??
					null,
			);
			setSelectedSubSubjectId(
				(current) =>
					current ??
					playerState.active_sub_subject_id ??
					playerState.assigned_subjects[0]?.sub_subjects[0]?.id ??
					null,
			);
			setSelectedScenarioId(
				(current) => current ?? playerState.active_scenario_id,
			);
			if (isGamePhase(playerState.current_phase))
				setPhase(playerState.current_phase);
			const [playerOrders, legacyState] = await Promise.all([
				api
					.getPlayerOrders(playerState.current_turn)
					.catch(() => playerState.orders ?? []),
				api.getGameState().catch(() => null),
			]);
			setOrders(playerOrders);
			if (legacyState?.data) {
				const currentPhase =
					legacyState.data.game.currentPhase ?? legacyState.data.game.phase;
				if (isGamePhase(currentPhase))
					setPhase(currentPhase.toUpperCase() as GamePhase);
				setGameId(String(legacyState.data.game.gameId));
				setMarket(legacyState.data.blackMarketItems);
				const currentTeam = legacyState.data.teams.find(
					(team) => team.id === playerState.team_id,
				);
				setActiveEffects(currentTeam?.activeEffects ?? []);
			}
		} catch (error) {
			setPageError(
				parseApiError(error, "دریافت وضعیت بازیکن ممکن نشد.").message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, token]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if (!selectedSubSubjectId) {
			setScenarios([]);
			return;
		}
		let active = true;
		void api
			.getPlayerScenarios(selectedSubSubjectId)
			.then((items) => {
				if (active) setScenarios(items);
			})
			.catch((error) => {
				if (active)
					toast.error(
						parseApiError(error, "دریافت سناریوها ناموفق بود.").message,
					);
			});
		return () => {
			active = false;
		};
	}, [api, selectedSubSubjectId]);

	useEffect(() => {
		if (!selectedScenarioId) {
			setSteps([]);
			return;
		}
		let active = true;
		void api
			.getPlayerScenarioSteps(selectedScenarioId)
			.then((items) => {
				if (active) setSteps(items);
			})
			.catch((error) => {
				if (active)
					toast.error(parseApiError(error, "دریافت گام‌ها ناموفق بود.").message);
			});
		return () => {
			active = false;
		};
	}, [api, selectedScenarioId]);

	const selectedSubject =
		state?.assigned_subjects.find(
			(subject) => subject.id === selectedSubjectId,
		) ?? null;

	const selectScenario = async (scenarioId: string) => {
		if (!canSelectScenario(phase)) return;
		setActionBusy(scenarioId);
		try {
			await api.selectPlayerScenario(scenarioId);
			setSelectedScenarioId(scenarioId);
			toast.success("مسیر سناریو برای تیم انتخاب شد.");
		} catch (error) {
			toast.error(parseApiError(error, "انتخاب سناریو ناموفق بود.").message);
		} finally {
			setActionBusy(null);
		}
	};

	const voteStep = async (stepId: string) => {
		if (!canVoteStep(phase)) return;
		setActionBusy(stepId);
		try {
			await api.votePlayerStep(stepId);
			toast.success("رأی شما برای این گام ثبت شد.");
			setSteps(await api.getPlayerScenarioSteps(selectedScenarioId ?? ""));
		} catch (error) {
			const parsed = parseApiError(error, "ثبت رأی ناموفق بود.");
			if (parsed.reasons.length > 0) setLockReasons(parsed.reasons);
			toast.error(parsed.message);
		} finally {
			setActionBusy(null);
		}
	};

	const inspectLock = async (stepId: string) => {
		setActionBusy(stepId);
		try {
			const response = await api.getPlayerLockReasons(stepId);
			setLockReasons(response.reasons);
		} catch (error) {
			toast.error(parseApiError(error, "دریافت دلایل قفل ناموفق بود.").message);
		} finally {
			setActionBusy(null);
		}
	};

	const purchaseMarketItem = async (item: BlackMarketItemSchema) => {
		setActionBusy(`market-${item.id}`);
		try {
			await api.voteAction({ black_market_item_id: item.id });
			toast.success("درخواست خرید از مسیر موجود بازی ثبت شد.");
		} catch (error) {
			toast.error(parseApiError(error, "خرید آیتم ناموفق بود.").message);
		} finally {
			setActionBusy(null);
		}
	};

	if (!token)
		return (
			<main className="grid min-h-screen place-items-center bg-[#070b17] p-6 text-slate-100">
				<Card className="max-w-md border-white/10 bg-slate-950/70 text-center text-slate-100">
					<CardContent className="p-8">
						<ShieldAlert className="mx-auto size-12 text-amber-300" />
						<h1 className="mt-4 text-xl font-black">ورود بازیکن لازم است</h1>
						<p className="mt-2 text-sm leading-7 text-slate-400">
							برای دیدن وضعیت نقش‌محور، ابتدا با حساب بازیکن وارد شوید.
						</p>
						<Link href="/login">
							<Button className="mt-5 bg-cyan-400 text-slate-950">
								رفتن به ورود
							</Button>
						</Link>
					</CardContent>
				</Card>
			</main>
		);

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#070b17] text-slate-100 [background-image:radial-gradient(circle_at_10%_0%,rgba(8,145,178,.16),transparent_25%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,.12),transparent_22%)]">
			<motion.div
				className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-cyan-400/10 blur-3xl"
				animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
			/>
			<motion.div
				className="pointer-events-none absolute -left-32 top-1/3 size-80 rounded-full bg-violet-500/10 blur-3xl"
				animate={{ y: [0, -42, 0], opacity: [0.2, 0.5, 0.2] }}
				transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY }}
			/>
			<div className="relative mx-auto max-w-[1500px] space-y-5 px-4 py-5 lg:px-7">
				<motion.header
					initial={{ opacity: 0, y: -18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					className="rounded-[26px] border border-white/10 bg-slate-950/65 p-5 backdrop-blur-xl"
				>
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
								<Crosshair className="size-7" />
							</div>
							<div>
								<div className="text-xs text-cyan-300">
									مرکز عملیات تیم {state?.team_id ?? "—"}
								</div>
								<h1 className="mt-1 text-2xl font-black">داشبورد مأموریت</h1>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() => void refresh()}
								variant="outline"
								className="border-white/10 bg-white/5"
								disabled={loading}
							>
								<RefreshCw
									className={`size-4 ${loading ? "animate-spin" : ""}`}
								/>{" "}
								همگام‌سازی
							</Button>
						</div>
					</div>
				</motion.header>

				<AnimatePresence>
					{pageError && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100"
						>
							<AlertTriangle className="size-5 shrink-0" />
							{pageError}
						</motion.div>
					)}
				</AnimatePresence>
				<AnimatePresence mode="wait">
					{loading && !state ? (
						<motion.div
							key="loading"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0, scale: 0.97 }}
							className="grid min-h-[60vh] place-items-center"
						>
							<LoaderCircle className="size-10 animate-spin text-cyan-300" />
						</motion.div>
					) : (
						<motion.div
							key="dashboard"
							initial={{ opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
							className="space-y-5"
						>
							<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
								<div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
									<div className="flex items-center gap-2 text-xs text-cyan-200">
										<Clock3 className="size-4" /> نوبت جاری
									</div>
									<div className="mt-2 text-2xl font-black">
										{state?.current_turn ?? "—"}
									</div>
								</div>
								<div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
									<div className="flex items-center gap-2 text-xs text-violet-200">
										<Gauge className="size-4" /> فاز بازی
									</div>
									<div className="mt-2 font-black">{formatPhaseFa(phase)}</div>
								</div>
								<div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
									<div className="flex items-center gap-2 text-xs text-amber-200">
										<Coins className="size-4" /> اعتبار تیم
									</div>
									<div className="mt-2 text-2xl font-black">
										{state?.credits.toLocaleString("fa-IR") ?? "—"}
									</div>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
									<div className="text-xs text-slate-500">موضوع فعال</div>
									<div className="mt-2 line-clamp-1 font-bold">
										{selectedSubject
											? getLocalized(
													selectedSubject.title,
													selectedSubject.title_fa,
												)
											: "انتخاب نشده"}
									</div>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
									<div className="text-xs text-slate-500">سناریوی فعال</div>
									<div className="mt-2 line-clamp-1 font-bold">
										{scenarios.find((item) => item.id === selectedScenarioId)
											?.title_fa ??
											scenarios.find((item) => item.id === selectedScenarioId)
												?.title ??
											"انتخاب نشده"}
									</div>
								</div>
							</section>

							{activeEffects.length > 0 && (
								<section className="flex flex-wrap items-center gap-2 rounded-2xl border border-orange-400/15 bg-orange-500/5 p-3">
									<Activity className="size-4 text-orange-300" />
									<span className="text-xs font-bold text-orange-200">
										اثرهای فعال:
									</span>
									{activeEffects.map((effect, index) => (
										<Badge
											key={`${effect.effectType}-${index}`}
											className="bg-orange-500/15 text-orange-100"
										>
											{effect.itemName ?? effect.effectType} ·{" "}
											{effect.turnsRemaining} نوبت
										</Badge>
									))}
								</section>
							)}

							<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
								<div className="space-y-5">
									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<ScrollText className="size-5 text-amber-300" /> دستورات
												دولت
											</CardTitle>
										</CardHeader>
										<CardContent className="grid gap-3 md:grid-cols-2">
											{orders.length === 0 ? (
												<div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
													برای این نوبت دستوری صادر نشده است.
												</div>
											) : (
												orders.map((order, index) => (
													<div
														key={`${order.government_team_id}-${order.turn}-${index}`}
														className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4"
													>
														<div className="flex items-center justify-between">
															<Badge className="bg-amber-500/15 text-amber-200">
																{formatOrderTypeFa(order.order_type)}
															</Badge>
															{order.forced && (
																<Badge className="bg-rose-500/15 text-rose-200">
																	اجباری
																</Badge>
															)}
														</div>
														<p className="mt-3 text-sm text-slate-400">
															دستور دولت {order.government_team_id} برای تیم شما
															در نوبت {order.turn}
														</p>
													</div>
												))
											)}
										</CardContent>
									</Card>

									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<Target className="size-5 text-cyan-300" /> موضوع‌های
												محول‌شده
											</CardTitle>
										</CardHeader>
										<CardContent className="grid gap-3 lg:grid-cols-2">
											{state?.assigned_subjects.map((subject) => (
												<motion.button
													type="button"
													key={subject.id}
													onClick={() => {
														setSelectedSubjectId(subject.id);
														setSelectedSubSubjectId(
															subject.sub_subjects[0]?.id ?? null,
														);
													}}
													whileHover={{ y: -4, scale: 1.01 }}
													whileTap={{ scale: 0.985 }}
													className={`rounded-2xl border p-4 text-right transition ${selectedSubjectId === subject.id ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<div className="font-black">
																{getLocalized(subject.title, subject.title_fa)}
															</div>
															<div className="mt-1 text-xs text-slate-500">
																{subject.subject_type}
															</div>
														</div>
														<Badge
															className={
																subject.status === "stalled"
																	? "bg-orange-500/15 text-orange-200"
																	: subject.status === "completed"
																		? "bg-emerald-500/15 text-emerald-200"
																		: "bg-cyan-500/15 text-cyan-200"
															}
														>
															{subject.status === "stalled"
																? "متوقف‌شده"
																: subject.status === "completed"
																	? "تکمیل‌شده"
																	: "فعال"}
														</Badge>
													</div>
													<div className="mt-4 flex items-center justify-between text-xs">
														<span className="text-slate-500">پیشرفت</span>
														<strong>
															{subject.progress_percent.toLocaleString("fa-IR")}
															٪
														</strong>
													</div>
													<Progress
														value={subject.progress_percent}
														className="mt-2"
													/>
												</motion.button>
											))}
										</CardContent>
									</Card>

									{selectedSubject && (
										<Card className="border-white/10 bg-slate-950/55 text-slate-100">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<GitBranch className="size-5 text-violet-300" />{" "}
													انتخاب مسیر
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="mb-4 flex flex-wrap gap-2">
													{selectedSubject.sub_subjects.map((subSubject) => (
														<motion.button
															key={subSubject.id}
															type="button"
															onClick={() =>
																setSelectedSubSubjectId(subSubject.id)
															}
															whileHover={{ y: -2 }}
															whileTap={{ scale: 0.98 }}
															className={`rounded-xl border px-3 py-2 text-sm ${selectedSubSubjectId === subSubject.id ? "border-violet-400/40 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[0.03] text-slate-400"}`}
														>
															{getLocalized(
																subSubject.title,
																subSubject.title_fa,
															)}{" "}
															· {subSubject.progress_share}٪{" "}
															{subSubject.completed && (
																<CheckCircle2 className="mr-1 inline size-3 text-emerald-300" />
															)}
														</motion.button>
													))}
												</div>
												<div className="grid gap-3 lg:grid-cols-2">
													{scenarios.map((scenario) => (
														<motion.div
															key={scenario.id}
															initial={{ opacity: 0, y: 10 }}
															animate={{ opacity: 1, y: 0 }}
															whileHover={{ y: -4 }}
															className={`rounded-2xl border p-4 ${selectedScenarioId === scenario.id ? "border-violet-400/40 bg-violet-500/10" : "border-white/8 bg-white/[0.03]"}`}
														>
															<div className="flex items-start justify-between">
																<div>
																	<h3 className="font-black">
																		{getLocalized(
																			scenario.title,
																			scenario.title_fa,
																		)}
																	</h3>
																	<div className="mt-2 flex gap-2">
																		<Badge variant="secondary">
																			{formatScenarioTypeFa(
																				scenario.scenario_type,
																			)}
																		</Badge>
																		<Badge variant="secondary">
																			{formatExecutionModeFa(
																				scenario.execution_mode,
																			)}
																		</Badge>
																	</div>
																</div>
																<Swords className="size-5 text-violet-300" />
															</div>
															<Button
																onClick={() => void selectScenario(scenario.id)}
																disabled={
																	!canSelectScenario(phase) ||
																	actionBusy !== null
																}
																className="mt-4 w-full bg-violet-400 text-slate-950 hover:bg-violet-300"
															>
																{actionBusy === scenario.id ? (
																	<LoaderCircle className="size-4 animate-spin" />
																) : (
																	<ChevronLeft className="size-4" />
																)}{" "}
																{selectedScenarioId === scenario.id
																	? "مسیر فعال"
																	: "انتخاب این مسیر"}
															</Button>
														</motion.div>
													))}
												</div>
												{!canSelectScenario(phase) && (
													<p className="mt-3 text-xs text-amber-300">
														انتخاب مسیر فقط در فاز «انتخاب مسیر» باز است.
													</p>
												)}
											</CardContent>
										</Card>
									)}

									{selectedScenarioId && (
										<Card className="border-white/10 bg-slate-950/55 text-slate-100">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<Vote className="size-5 text-emerald-300" /> گام‌های
													سناریو
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3">
												{steps.map((step) => (
													<motion.div
														key={step.id}
														initial={{ opacity: 0, x: 16 }}
														animate={{ opacity: 1, x: 0 }}
														transition={{
															delay: Math.min((step.order ?? 1) * 0.07, 0.3),
														}}
														whileHover={{ x: -4 }}
														className={`rounded-2xl border p-4 ${statusTone[step.status]}`}
													>
														<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
															<div className="flex items-start gap-3">
																<div className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/20 font-black">
																	{step.order ?? "•"}
																</div>
																<div>
																	<div className="flex flex-wrap items-center gap-2">
																		<h3 className="font-black">
																			{getLocalized(
																				step.action_name ?? step.action_code,
																				step.action_name_fa,
																			)}
																		</h3>
																		<Badge variant="secondary">
																			{formatStepStatusFa(step.status)}
																		</Badge>
																		{step.required && (
																			<Badge className="bg-rose-500/15 text-rose-200">
																				الزامی
																			</Badge>
																		)}
																	</div>
																	{(step.cost !== undefined ||
																		step.probability !== undefined) && (
																		<div className="mt-2 flex gap-4 text-xs opacity-70">
																			<span>هزینه: {step.cost ?? "—"}</span>
																			<span>
																				احتمال: {step.probability ?? "—"}٪
																			</span>
																		</div>
																	)}
																</div>
															</div>
															<div className="flex gap-2">
																{step.status === "locked" && (
																	<Button
																		variant="outline"
																		onClick={() => void inspectLock(step.id)}
																		disabled={actionBusy !== null}
																		className="border-white/15 bg-black/10"
																	>
																		<LockKeyhole className="size-4" /> دلیل قفل
																	</Button>
																)}
																<Button
																	onClick={() => void voteStep(step.id)}
																	disabled={
																		!canVoteStep(phase) ||
																		!step.available ||
																		actionBusy !== null
																	}
																	className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
																>
																	{actionBusy === step.id ? (
																		<LoaderCircle className="size-4 animate-spin" />
																	) : (
																		<Vote className="size-4" />
																	)}{" "}
																	ثبت رأی
																</Button>
															</div>
														</div>
													</motion.div>
												))}
											</CardContent>
										</Card>
									)}

									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<ShoppingBag className="size-5 text-fuchsia-300" />{" "}
												بازار سیاه
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid gap-3 md:grid-cols-2">
												{market.length === 0 ? (
													<div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
														آیتم فعالی از API بازی دریافت نشد.
													</div>
												) : (
													market.map((item) => (
														<motion.div
															key={item.id}
															whileHover={{ y: -4, scale: 1.01 }}
															className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-4"
														>
															<div className="flex items-center justify-between">
																<div className="font-bold">{item.name}</div>
																<Badge className="bg-fuchsia-500/15 text-fuchsia-200">
																	<CircleDollarSign className="size-3" />{" "}
																	{item.cost}
																</Badge>
															</div>
															<div className="mt-2 text-xs text-slate-500">
																{item.effectType} · {item.duration ?? 1} نوبت
															</div>
															<Button
																onClick={() => void purchaseMarketItem(item)}
																disabled={actionBusy !== null}
																variant="outline"
																className="mt-3 w-full border-fuchsia-400/20 bg-fuchsia-500/5"
															>
																درخواست خرید
															</Button>
														</motion.div>
													))
												)}
											</div>
										</CardContent>
									</Card>
								</div>
								<aside className="space-y-5">
									<GameEventFeed
										events={events.events}
										status={events.status}
									/>
									<CommunicationPanel
										service={communicationService}
										gameId={gameId ?? "active-game"}
										senderRole="BOTH"
										relatedScenarioId={selectedScenarioId}
									/>
								</aside>
							</section>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<Dialog
				open={lockReasons !== null}
				onOpenChange={(open) => {
					if (!open) setLockReasons(null);
				}}
			>
				<DialogContent className="border-white/10 bg-slate-950 text-slate-100">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<LockKeyhole className="size-5 text-amber-300" /> دلایل قفل بودن
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						{lockReasons?.length === 0 && (
							<div className="text-sm text-slate-400">
								دلیل فعالی از سرور بازگردانده نشد.
							</div>
						)}
						{lockReasons?.map((reason, index) => (
							<div
								key={`${reason.code}-${index}`}
								className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-4"
							>
								<div className="font-mono text-xs text-amber-300">
									{reason.code}
								</div>
								<p className="mt-2 text-sm leading-7">
									{formatLockReasonFa(reason.code, reason.message)}
								</p>
								{reason.source && (
									<div className="mt-2 text-[10px] text-slate-500">
										منبع: {reason.source}
									</div>
								)}
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
