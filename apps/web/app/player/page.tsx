"use client";

import type {
	ActionSchema,
	GamePhase,
	GovernmentCatalogAction,
	GovernmentCatalogSubject,
	GovernmentOrderType,
	OrderView,
	PlayerSchema,
	ScenarioView,
	StepView,
	SubjectView,
} from "@workspace/trpc";
import {
	canSelectScenario,
	canVoteStep,
	isGameFinished,
	isTerminalGameEvent,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	BookOpen,
	CheckCircle2,
	ChevronLeft,
	Clock3,
	Coins,
	Crosshair,
	Gauge,
	GitBranch,
	LoaderCircle,
	LogOut,
	RefreshCw,
	ScrollText,
	ShieldAlert,
	Swords,
	Target,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AiAssistantUpgradePanel } from "@/components/v2/ai/AiAssistantUpgradePanel";
import { SubjectAiButton } from "@/components/v2/ai/SubjectAiButton";
import { SubjectAiInsightDialog } from "@/components/v2/ai/SubjectAiInsightDialog";
import { CommunicationPanel } from "@/components/v2/CommunicationPanel";
import { GameEventFeed } from "@/components/v2/GameEventFeed";
import { GameFinishedResult } from "@/components/v2/GameFinishedResult";
import { LockReasonsDialog } from "@/components/v2/LockReasonsDialog";
import PlayerMoveInsight from "@/components/v2/player/PlayerMoveInsight";
import type { ArenaActionInfo } from "@/components/v2/player/ScenarioVotingArena";
import { ScenarioVotingArena } from "@/components/v2/player/ScenarioVotingArena";
import { useAiAssistantLevel } from "@/hooks/useAiAssistantLevel";
import { useGameEvents } from "@/hooks/useGameEvents";
import { useIncomingOrderNotifications } from "@/hooks/useIncomingOrderNotifications";
import { useLockReasons } from "@/hooks/useLockReasons";
import { usePlayerOrders } from "@/hooks/usePlayerOrders";
import { usePlayerScenarios } from "@/hooks/usePlayerScenarios";
import { usePlayerState } from "@/hooks/usePlayerState";
import { usePlayerSubjects } from "@/hooks/usePlayerSubjects";
import { usePurchaseAiAssistantLevel } from "@/hooks/usePurchaseAiAssistantLevel";
import { useScenarioSteps } from "@/hooks/useScenarioSteps";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { createCommunicationService } from "@/lib/communicationService";
import { createPlayerRuntimeApi } from "@/lib/playerRuntimeApi";
import {
	formatExecutionModeFa,
	formatOrderTypeFa,
	formatPhaseFa,
	formatScenarioTypeFa,
	getLocalized,
	isGamePhase,
	translateSubjectStatusFa,
} from "@/lib/runtimeTranslationsFa";
import type { SubjectRuntimeProgress } from "@/lib/subjectAiInsightGenerator";
import { useAuthStore } from "@/store/auth.store";

const orderDetailFa = (order: OrderView): string => {
	const payload = order.payload;
	const subjectId = payload.subject_id;
	const actionCode = payload.action_code;
	const amount = payload.amount;
	if (typeof subjectId === "string") return `موضوع: ${subjectId}`;
	if (typeof actionCode === "string") return `کنش: ${actionCode}`;
	if (typeof amount === "number")
		return `اعتبار: ${amount.toLocaleString("fa-IR")}`;
	return `تیم هدف: ${order.target_team_id}`;
};

const forcedOrder = (type: GovernmentOrderType, forced: boolean): boolean =>
	forced || type === "FORCE_SUBJECT" || type === "DISABLE_TEAM";

const formatNumberFa = (value: number): string => value.toLocaleString("fa-IR");

const readPlayerTeamId = (player: PlayerSchema): number | null => {
	const rawTeamId = player.teamId ?? player.team_id;
	return typeof rawTeamId === "number" && Number.isFinite(rawTeamId)
		? rawTeamId
		: null;
};

const readPlayerLeaderFlag = (player: PlayerSchema): boolean =>
	player.isLeader === true || player.is_leader === true;

const actionTypeFromCode = (code: string): "attack" | "defense" =>
	code.toUpperCase().startsWith("DEF_") ? "defense" : "attack";

const readActionNumber = (
	source: Record<string, unknown>,
	keys: string[],
): number | null => {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
	}
	const stats = source.base_stats ?? source.baseStats;
	if (stats !== null && typeof stats === "object" && !Array.isArray(stats)) {
		return readActionNumber(stats as Record<string, unknown>, keys);
	}
	return null;
};

const readActionText = (
	source: Record<string, unknown>,
	keys: string[],
): string | null => {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "string" && value.trim().length > 0) return value.trim();
	}
	return null;
};

/**
 * The steps endpoint may leave out the action name, cost and probability. The
 * game-state catalog always carries them, keyed by the action code, so the
 * voting arena can fill the gaps instead of showing a raw code.
 */
const buildArenaActionCatalog = (
	actions: ActionSchema[],
): ArenaActionInfo[] =>
	actions.map((action) => {
		const raw = action as unknown as Record<string, unknown>;
		return {
			code: action.name,
			name: readActionText(raw, ["displayName", "display_name", "name"]),
			nameFa: readActionText(raw, [
				"displayNameFa",
				"display_name_fa",
				"nameFa",
				"name_fa",
			]),
			cost: readActionNumber(raw, ["cost"]),
			probability: readActionNumber(raw, [
				"probability",
				"successProbability",
				"success_probability",
			]),
			points: readActionNumber(raw, [
				"points",
				"pointsOnSuccess",
				"points_on_success",
			]),
		};
	});

const buildPlayerActionsByCode = (
	steps: StepView[],
): Record<string, GovernmentCatalogAction> =>
	Object.fromEntries(
		steps.map((step) => [
			step.action_code,
			{
				code: step.action_code,
				name: step.action_name ?? step.action_code,
				name_fa: step.action_name_fa,
				type: actionTypeFromCode(step.action_code),
				base_stats: {
					...(typeof step.cost === "number" ? { cost: step.cost } : {}),
					...(typeof step.probability === "number"
						? { success_probability: step.probability }
						: {}),
				},
			},
		]),
	);

const buildPlayerAiSubject = ({
	subject,
	teamId,
	sideId,
	selectedSubSubjectId,
	scenarios,
	selectedScenarioId,
	steps,
}: {
	subject: SubjectView;
	teamId: number;
	sideId: number;
	selectedSubSubjectId: string | null;
	scenarios: ScenarioView[];
	selectedScenarioId: string | null;
	steps: StepView[];
}): GovernmentCatalogSubject => ({
	id: subject.id,
	goal_id: "player-assigned",
	title: subject.title,
	title_fa: subject.title_fa,
	subject_type: subject.subject_type,
	target_team_id: teamId,
	owner_side_id: sideId,
	sub_subjects: subject.sub_subjects.map((subSubject) => ({
		id: subSubject.id,
		subject_id: subject.id,
		title: subSubject.title,
		title_fa: subSubject.title_fa,
		progress_share: subSubject.progress_share,
		scenarios:
			subSubject.id === selectedSubSubjectId
				? scenarios.map((scenario) => ({
						id: scenario.id,
						sub_subject_id: subSubject.id,
						title: scenario.title,
						title_fa: scenario.title_fa,
						scenario_type: scenario.scenario_type,
						execution_mode: scenario.execution_mode,
						steps:
							scenario.id === selectedScenarioId
								? steps.map((step) => ({
										id: step.id,
										scenario_id: scenario.id,
										order: step.order,
										action_code: step.action_code,
										required: step.required,
									}))
								: [],
					}))
				: [],
	})),
});

const eventTypeHas = (type: string, terms: string[]): boolean =>
	terms.some((term) => type.includes(term));

type AiInsightSnapshot = {
	subject: GovernmentCatalogSubject;
	runtimeProgress: SubjectRuntimeProgress;
	actionsByCode: Record<string, GovernmentCatalogAction>;
	currentTurn: number | null;
	currentPhase: GamePhase;
};

export default function PlayerDashboardPage() {
	const { token, user, clearAuth } = useAuthStore();
	const api = useMemo(() => createPlayerRuntimeApi(token ?? ""), [token]);
	const runtime = usePlayerState(api, Boolean(token));
	const subjectsResource = usePlayerSubjects(
		api,
		Boolean(token),
		runtime.state?.assigned_subjects,
	);
	const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
		null,
	);
	const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<
		string | null
	>(null);
	const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
		null,
	);
	const [aiInsightSnapshot, setAiInsightSnapshot] =
		useState<AiInsightSnapshot | null>(null);
	const [actionBusy, setActionBusy] = useState<string | null>(null);
	const subjects =
		subjectsResource.subjects.length > 0
			? subjectsResource.subjects
			: (runtime.state?.assigned_subjects ?? []);
	const selectedSubject =
		subjects.find((subject) => subject.id === selectedSubjectId) ?? null;
	const scenariosResource = usePlayerScenarios(api, selectedSubSubjectId);
	const stepsResource = useScenarioSteps(api, selectedScenarioId);
	const phase: GamePhase = isGamePhase(runtime.state?.current_phase)
		? runtime.state.current_phase
		: (runtime.context?.currentPhase ?? "GOVERNMENT_SELECTION");
	const ordersResource = usePlayerOrders(
		api,
		runtime.state?.current_turn,
		Boolean(token && runtime.state),
	);
	const aiLevelResource = useAiAssistantLevel({
		token,
		context: "player",
		enabled: Boolean(token),
	});
	const purchaseAiLevelResource = usePurchaseAiAssistantLevel({
		token,
		context: "player",
	});
	const gameId = runtime.context?.gameId ?? null;
	const gameState = runtime.context?.gameState ?? null;
	const arenaActionCatalog = useMemo(
		() => buildArenaActionCatalog(runtime.context?.actions ?? []),
		[runtime.context?.actions],
	);
	const playerAiLevel =
		aiLevelResource.status === "ready"
			? aiLevelResource.level.current_level
			: 0;
	const playerAiDisabledMessage =
		aiLevelResource.status === "unconfigured" ||
		aiLevelResource.status === "error"
			? aiLevelResource.message
			: playerAiLevel <= 0
				? "AI هنوز خریداری نشده است."
				: null;
	const isTeamLeader = useMemo(() => {
		if (!gameState || !user || !runtime.state) return false;
		const currentPlayer = gameState.players.find(
			(player) => player.id === user.id,
		);
		return Boolean(
			currentPlayer &&
				readPlayerTeamId(currentPlayer) === runtime.state.team_id &&
				readPlayerLeaderFlag(currentPlayer),
		);
	}, [gameState, runtime.state, user]);
	const teamMembers = useMemo(() => {
		if (!gameState || !runtime.state) return [];
		return gameState.players.filter(
			(player) => readPlayerTeamId(player) === runtime.state?.team_id,
		);
	}, [gameState, runtime.state]);
	const openAiInsight = useCallback(
		(subject: SubjectView) => {
			setAiInsightSnapshot({
				subject: buildPlayerAiSubject({
					subject,
					teamId: runtime.state?.team_id ?? runtime.context?.teamId ?? 0,
					sideId: runtime.context?.sideId ?? 0,
					selectedSubSubjectId,
					scenarios: scenariosResource.scenarios,
					selectedScenarioId,
					steps: stepsResource.steps,
				}),
				runtimeProgress: {
					progress_percent: subject.progress_percent,
					status: subject.status,
					sub_subjects: subject.sub_subjects,
				},
				actionsByCode: buildPlayerActionsByCode(stepsResource.steps),
				currentTurn: runtime.state?.current_turn ?? null,
				currentPhase: phase,
			});
		},
		[
			phase,
			runtime.context?.sideId,
			runtime.context?.teamId,
			runtime.state?.current_turn,
			runtime.state?.team_id,
			scenariosResource.scenarios,
			selectedScenarioId,
			selectedSubSubjectId,
			stepsResource.steps,
		],
	);
	const closeAiInsight = useCallback((open: boolean) => {
		if (!open) setAiInsightSnapshot(null);
	}, []);
	const stateFinished = isGameFinished(gameState?.game);
	const events = useGameEvents(gameId, token, !stateFinished);
	const terminalEventReceived = events.events.some(isTerminalGameEvent);
	useIncomingOrderNotifications({
		events: events.events,
		status: events.status,
		targetTeamId: runtime.state?.team_id,
	});
	const loadPlayerLockReasons = useCallback(
		(nodeId: string) => api.getLockReasons(nodeId),
		[api],
	);
	const locks = useLockReasons(loadPlayerLockReasons);
	const exitPlayer = useCallback(() => {
		clearAuth();
		toast.success("از پنل بازیکن خارج شدید.");
	}, [clearAuth]);

	const communicationService = useMemo(
		() =>
			createCommunicationService({
				token: token ?? "",
				gameId: gameId ?? "active-game",
				senderUserId: user?.id ?? 0,
				senderTeamId: runtime.state?.team_id ?? 0,
				senderSideId: runtime.context?.sideId ?? undefined,
				senderRole:
					runtime.context?.role === "GOVERNMENT"
						? "BOTH"
						: (runtime.context?.role ?? "BOTH"),
				turn: runtime.state?.current_turn ?? 0,
				phase,
			}),
		[
			gameId,
			phase,
			runtime.context?.role,
			runtime.context?.sideId,
			runtime.state?.current_turn,
			runtime.state?.team_id,
			token,
			user?.id,
		],
	);

	useEffect(() => {
		if (subjects.length === 0) {
			setSelectedSubjectId(null);
			setSelectedSubSubjectId(null);
			return;
		}
		const activeSubject =
			subjects.find((item) => item.id === runtime.state?.active_subject_id) ??
			subjects.find((item) => item.id === selectedSubjectId) ??
			subjects[0];
		if (!activeSubject) return;
		setSelectedSubjectId(activeSubject.id);
		setSelectedSubSubjectId((current) => {
			if (activeSubject.sub_subjects.some((item) => item.id === current)) {
				return current;
			}
			return (
				activeSubject.sub_subjects.find(
					(item) => item.id === runtime.state?.active_sub_subject_id,
				)?.id ??
				activeSubject.sub_subjects[0]?.id ??
				null
			);
		});
	}, [runtime.state, selectedSubjectId, subjects]);

	useEffect(() => {
		if (runtime.state?.active_scenario_id) {
			setSelectedScenarioId(runtime.state.active_scenario_id);
		}
	}, [runtime.state?.active_scenario_id]);

	const latestEventSeq = events.events[0]?.seq ?? 0;
	const latestEventType = events.events[0]?.type ?? "";
	const refreshRuntime = runtime.refresh;
	const refreshSubjects = subjectsResource.refresh;
	const refreshOrders = ordersResource.refresh;
	const refreshSteps = stepsResource.refresh;
	const refreshAi = aiLevelResource.refresh;

	useEffect(() => {
		if (latestEventSeq === 0) return;
		if (
			eventTypeHas(latestEventType, [
				"TURN",
				"PHASE",
				"GAME",
				"ORDER",
				"SCENARIO",
				"STEP",
				"VOTE",
				"AI",
			])
		) {
			void refreshRuntime();
		}
		if (eventTypeHas(latestEventType, ["ORDER", "SCENARIO", "STEP", "TURN"])) {
			void refreshSubjects();
		}
		if (eventTypeHas(latestEventType, ["ORDER", "TURN"])) {
			void refreshOrders();
		}
		if (
			selectedScenarioId &&
			eventTypeHas(latestEventType, [
				"STEP",
				"SCENARIO",
				"PHASE",
				"TURN",
				"VOTE",
			])
		) {
			void refreshSteps();
		}
		if (eventTypeHas(latestEventType, ["AI", "TURN"])) {
			void refreshAi();
		}
	}, [
		latestEventSeq,
		latestEventType,
		refreshAi,
		refreshOrders,
		refreshRuntime,
		refreshSteps,
		refreshSubjects,
		selectedScenarioId,
	]);

	const selectScenario = async (scenarioId: string) => {
		if (!canSelectScenario(phase)) return;
		setActionBusy(`scenario-${scenarioId}`);
		try {
			const response = await api.selectScenario(scenarioId);
			setSelectedSubjectId(response.active_subject_id);
			setSelectedSubSubjectId(response.active_sub_subject_id);
			setSelectedScenarioId(response.active_scenario_id);
			toast.success("سناریو برای تیم انتخاب شد.");
			await runtime.refresh();
		} catch (requestError) {
			toast.error(
				parseRuntimeApiError(requestError, "انتخاب مسیر ناموفق بود.").message,
			);
		} finally {
			setActionBusy(null);
		}
	};

	const voteStep = async (stepId: string): Promise<boolean> => {
		if (!canVoteStep(phase)) return false;
		setActionBusy(`step-${stepId}`);
		try {
			await api.voteStep(stepId);
			toast.success("رأی شما برای این گام ثبت شد.");
			await Promise.all([stepsResource.refresh(), runtime.refresh()]);
			return true;
		} catch (requestError) {
			const parsed = parseRuntimeApiError(requestError, "ثبت رأی ناموفق بود.");
			if (parsed.reasons.length > 0) {
				await locks.inspect(stepId);
			}
			toast.error(parsed.message);
			return false;
		} finally {
			setActionBusy(null);
		}
	};

	const purchaseAiLevel = async () => {
		try {
			const response = await purchaseAiLevelResource.purchase();
			toast.success(`سطح ${formatNumberFa(response.level)} AI خریداری شد.`);
			await Promise.all([aiLevelResource.refresh(), runtime.refresh()]);
		} catch (requestError) {
			toast.error(
				requestError instanceof Error
					? requestError.message
					: "خرید ارتقا AI ناموفق بود.",
			);
			await Promise.allSettled([aiLevelResource.refresh(), runtime.refresh()]);
		}
	};

	if (!token) {
		return (
			<main className="grid min-h-screen place-items-center bg-[#070b17] p-6 text-slate-100">
				<Card className="max-w-md border-white/10 bg-slate-950/70 text-center text-slate-100">
					<CardContent className="p-8">
						<ShieldAlert className="mx-auto size-12 text-amber-300" />
						<h1 className="mt-4 text-xl font-black">ورود بازیکن لازم است</h1>
						<Link href="/login">
							<Button className="mt-5 bg-cyan-400 text-slate-950">
								رفتن به ورود
							</Button>
						</Link>
					</CardContent>
				</Card>
			</main>
		);
	}

	if (gameState && (stateFinished || terminalEventReceived)) {
		return (
			<GameFinishedResult
				state={gameState}
				terminalEventReceived={terminalEventReceived}
				finalizing={!stateFinished}
				refreshing={runtime.loading}
				onRefresh={() => void runtime.refresh()}
				onExit={exitPlayer}
			/>
		);
	}

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#070b17] text-slate-100 [background-image:radial-gradient(circle_at_10%_0%,rgba(8,145,178,.16),transparent_25%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,.12),transparent_22%)]">
			<motion.div
				className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-cyan-400/10 blur-3xl"
				animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
			/>
			<div className="relative mx-auto max-w-[1500px] space-y-5 px-4 py-5 lg:px-7">
				<header className="rounded-[26px] border border-white/10 bg-slate-950/65 p-5 backdrop-blur-xl">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
								<Crosshair className="size-7" />
							</div>
							<div>
								<div className="text-xs text-cyan-300">
									مرکز عملیات تیم {runtime.state?.team_id ?? "—"}
								</div>
								<h1 className="mt-1 text-2xl font-black">داشبورد مأموریت</h1>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								asChild
								variant="outline"
								className="border-white/10 bg-white/5"
							>
								<Link href="/docs">
									<BookOpen className="size-4" /> راهنما
								</Link>
							</Button>
							<Button
								onClick={() => void runtime.refresh()}
								variant="outline"
								className="border-white/10 bg-white/5"
								disabled={runtime.loading}
							>
								<RefreshCw
									className={`size-4 ${runtime.loading ? "animate-spin" : ""}`}
								/>{" "}
								همگام‌سازی
							</Button>
							<Button
								type="button"
								onClick={exitPlayer}
								variant="outline"
								className="border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200"
							>
								<LogOut className="size-4" /> خروج
							</Button>
						</div>
					</div>
				</header>

				<AnimatePresence>
					{runtime.error && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100"
						>
							<AlertTriangle className="size-5 shrink-0" /> {runtime.error}
						</motion.div>
					)}
				</AnimatePresence>

				{runtime.loading && !runtime.state ? (
					<div className="grid min-h-[60vh] place-items-center">
						<LoaderCircle className="size-10 animate-spin text-cyan-300" />
					</div>
				) : (
					<div className="space-y-5">
						<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
							{[
								{
									label: "نوبت جاری",
									value: `${runtime.state?.current_turn ?? "—"}`,
									icon: Clock3,
									className: "border-cyan-400/20 bg-cyan-500/10",
								},
								{
									label: "فاز بازی",
									value: formatPhaseFa(phase),
									icon: Gauge,
									className: "border-violet-400/20 bg-violet-500/10",
								},
								{
									label: "اعتبار تیم",
									value: runtime.state?.credits.toLocaleString("fa-IR") ?? "—",
									icon: Coins,
									className: "border-amber-400/20 bg-amber-500/10",
								},
								{
									label: "موضوع فعال",
									value: selectedSubject
										? getLocalized(
												selectedSubject.title,
												selectedSubject.title_fa,
											)
										: "انتخاب نشده",
									icon: Target,
									className: "border-cyan-400/20 bg-cyan-500/10",
								},
								{
									label: "مسیر فعال",
									value:
										scenariosResource.scenarios.find(
											(item) => item.id === selectedScenarioId,
										)?.title_fa ??
										scenariosResource.scenarios.find(
											(item) => item.id === selectedScenarioId,
										)?.title ??
										selectedScenarioId ??
										"انتخاب نشده",
									icon: Swords,
									className: "border-violet-400/20 bg-violet-500/10",
								},
							].map((metric) => {
								const Icon = metric.icon;
								return (
									<div
										key={metric.label}
										className={`rounded-2xl border p-4 ${metric.className}`}
									>
										<div className="flex items-center gap-2 text-xs text-slate-400">
											<Icon className="size-4" /> {metric.label}
										</div>
										<div className="mt-2 line-clamp-2 font-black">
											{metric.value}
										</div>
									</div>
								);
							})}
						</section>

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
										{ordersResource.error && (
											<div className="col-span-full text-sm text-rose-300">
												{ordersResource.error}
											</div>
										)}
										{ordersResource.orders.length === 0 ? (
											<div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
												برای این نوبت دستوری صادر نشده است.
											</div>
										) : (
											ordersResource.orders.map((order, index) => (
												<div
													key={`${order.turn}-${order.government_team_id}-${index}`}
													className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4"
												>
													<div className="flex items-center justify-between gap-2">
														<Badge className="bg-amber-500/15 text-amber-200">
															{formatOrderTypeFa(order.order_type)}
														</Badge>
														<Badge
															className={
																forcedOrder(order.order_type, order.forced)
																	? "bg-rose-500/15 text-rose-200"
																	: "bg-cyan-500/15 text-cyan-200"
															}
														>
															{forcedOrder(order.order_type, order.forced)
																? "اجباری"
																: "راهنمایی"}
														</Badge>
													</div>
													<p className="mt-3 text-sm text-slate-300">
														{orderDetailFa(order)}
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
											واگذارشده به تیم شما
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-3 lg:grid-cols-2">
										{subjects.map((subject) => (
											<motion.button
												type="button"
												key={subject.id}
												onClick={() => {
													setSelectedSubjectId(subject.id);
													setSelectedSubSubjectId(
														subject.sub_subjects[0]?.id ?? null,
													);
													setSelectedScenarioId(null);
												}}
												whileHover={{ y: -4 }}
												className={`rounded-2xl border p-4 text-right ${selectedSubjectId === subject.id ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/8 bg-white/[0.03]"}`}
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
														{translateSubjectStatusFa(subject.status)}
													</Badge>
												</div>
												<div className="mt-4 flex justify-between text-xs">
													<span className="text-slate-500">پیشرفت</span>
													<strong>
														{subject.progress_percent.toLocaleString("fa-IR")}٪
													</strong>
												</div>
												<Progress
													value={subject.progress_percent}
													className="mt-2"
												/>
												<div className="mt-3 flex flex-wrap gap-1.5">
													{subject.sub_subjects.map((sub) => (
														<span
															key={sub.id}
															className={`rounded-lg px-2 py-1 text-[10px] ${sub.completed ? "bg-emerald-500/10 text-emerald-200" : "bg-white/5 text-slate-400"}`}
														>
															{getLocalized(sub.title, sub.title_fa)} ·{" "}
															{sub.progress_share}٪ {sub.completed && "✓"}
														</span>
													))}
												</div>
											</motion.button>
										))}
									</CardContent>
								</Card>

								{selectedSubject && (
									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center justify-between gap-2 text-base">
												<span className="flex items-center gap-2">
													<GitBranch className="size-5 text-violet-300" />{" "}
													انتخاب مسیر
												</span>
												<SubjectAiButton
													aiLevel={playerAiLevel}
													loading={aiLevelResource.loading}
													disabledMessage={playerAiDisabledMessage}
													onClick={() => openAiInsight(selectedSubject)}
													variant="text"
												/>
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="mb-3 text-xs leading-6 text-slate-400">
												ابتدا هدف این نوبت را انتخاب کنید، سپس مسیر آن را فعال
												کنید. «سهم» نشان می‌دهد پیشرفت روی آن هدف چقدر در
												پیشرفت کل موضوع اثر می‌گذارد.
											</p>
											<div className="mb-4 flex flex-wrap gap-2">
												{selectedSubject.sub_subjects.map((sub) => {
													const isActive =
														runtime.state?.active_sub_subject_id === sub.id;
													return (
														<button
															key={sub.id}
															type="button"
															onClick={() => {
																setSelectedSubSubjectId(sub.id);
																setSelectedScenarioId(null);
															}}
															className={`rounded-xl border px-3 py-2 text-right text-sm ${selectedSubSubjectId === sub.id ? "border-violet-400/40 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[0.03] text-slate-400"}`}
														>
															<span className="flex items-center gap-1.5 font-bold">
																{getLocalized(sub.title, sub.title_fa)}
																{sub.completed && (
																	<CheckCircle2 className="size-3.5 text-emerald-300" />
																)}
															</span>
															<span className="mt-0.5 block text-[11px] text-slate-500">
																سهم {formatNumberFa(sub.progress_share)}٪
																{isActive ? " · مسیر فعال تیم" : ""}
																{sub.stalled ? " · متوقف" : ""}
															</span>
														</button>
													);
												})}
											</div>
											{scenariosResource.error && (
												<p className="mb-3 text-sm text-rose-300">
													{scenariosResource.error}
												</p>
											)}
											<div className="grid gap-3 lg:grid-cols-2">
												{scenariosResource.scenarios.map((scenario) => (
													<div
														key={scenario.id}
														className={`rounded-2xl border p-4 ${selectedScenarioId === scenario.id ? "border-violet-400/40 bg-violet-500/10" : "border-white/8 bg-white/[0.03]"}`}
													>
														<h3 className="font-black">
															{getLocalized(scenario.title, scenario.title_fa)}
														</h3>
														<div className="mt-2 flex gap-2">
															<Badge variant="secondary">
																{formatScenarioTypeFa(scenario.scenario_type)}
															</Badge>
															<Badge variant="secondary">
																{formatExecutionModeFa(scenario.execution_mode)}
															</Badge>
															<SubjectAiButton
																aiLevel={playerAiLevel}
																loading={aiLevelResource.loading}
																disabledMessage={playerAiDisabledMessage}
																onClick={() => openAiInsight(selectedSubject)}
															/>
														</div>
														<Button
															onClick={() => void selectScenario(scenario.id)}
															disabled={
																!canSelectScenario(phase) || actionBusy !== null
															}
															className="mt-4 w-full bg-violet-400 text-slate-950 hover:bg-violet-300"
														>
															{actionBusy === `scenario-${scenario.id}` ? (
																<LoaderCircle className="size-4 animate-spin" />
															) : (
																<ChevronLeft className="size-4" />
															)}
															{selectedScenarioId === scenario.id
																? "مسیر فعال"
																: "انتخاب این مسیر"}
														</Button>
													</div>
												))}
											</div>
											{!canSelectScenario(phase) && (
												<p className="mt-3 text-xs text-amber-300">
													انتخاب مسیر فقط در فاز «انتخاب مسیر» ممکن است.
												</p>
											)}
										</CardContent>
									</Card>
								)}

								{selectedScenarioId && (
									<ScenarioVotingArena
										steps={stepsResource.steps}
										phase={phase}
										currentTurn={runtime.state?.current_turn ?? null}
										gameId={gameId}
										scenarioId={selectedScenarioId}
										currentUserId={user?.id ?? null}
										teamMembers={teamMembers}
										actionBusy={actionBusy}
										actionCatalog={arenaActionCatalog}
										loading={stepsResource.loading}
										error={stepsResource.error}
										onVote={voteStep}
										onInspectLocks={locks.inspect}
									/>
								)}
							</div>

							<aside className="space-y-5">
								<PlayerMoveInsight
									events={events.events}
									steps={stepsResource.steps}
									myTeamId={
										runtime.state?.team_id ?? runtime.context?.teamId ?? null
									}
								/>
								<AiAssistantUpgradePanel
									level={
										aiLevelResource.status === "ready"
											? aiLevelResource.level
											: null
									}
									loading={aiLevelResource.loading}
									purchasing={purchaseAiLevelResource.purchasing}
									error={
										purchaseAiLevelResource.error ??
										(aiLevelResource.status === "error"
											? aiLevelResource.message
											: null)
									}
									unavailableMessage={
										aiLevelResource.status === "unconfigured"
											? aiLevelResource.message
											: null
									}
									isLeader={isTeamLeader}
									onPurchase={() => void purchaseAiLevel()}
									onRefresh={() => void aiLevelResource.refresh()}
								/>
								<GameEventFeed
									events={events.events}
									status={events.status}
									error={events.error}
								/>
								<CommunicationPanel
									service={communicationService}
									gameId={gameId ?? "active-game"}
									senderUserId={user?.id ?? 0}
									senderRole={
										runtime.context?.role === "GOVERNMENT"
											? "BOTH"
											: (runtime.context?.role ?? "BOTH")
									}
									senderTeamId={runtime.state?.team_id ?? 0}
									senderSideId={runtime.context?.sideId ?? undefined}
									phase={phase}
									relatedScenarioId={selectedScenarioId}
								/>
							</aside>
						</section>
					</div>
				)}
			</div>

			<SubjectAiInsightDialog
				open={aiInsightSnapshot !== null}
				onOpenChange={closeAiInsight}
				aiLevel={playerAiLevel}
				subject={aiInsightSnapshot?.subject ?? null}
				runtimeProgress={aiInsightSnapshot?.runtimeProgress}
				actionsByCode={aiInsightSnapshot?.actionsByCode ?? {}}
				currentTurn={aiInsightSnapshot?.currentTurn ?? null}
				currentPhase={aiInsightSnapshot?.currentPhase ?? phase}
			/>

			<LockReasonsDialog
				open={locks.reasons !== null}
				nodeId={locks.nodeId}
				reasons={locks.reasons}
				loading={locks.loading}
				error={locks.error}
				onClose={locks.close}
				title="همه دلایل قفل گام"
			/>
		</main>
	);
}
