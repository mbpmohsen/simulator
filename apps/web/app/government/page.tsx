"use client";

import type {
	GovernmentOrderType,
	GovernmentTeamProgress,
	OrderView,
} from "@workspace/trpc";
import {
	getGovernmentCatalogActionLabel,
	getGovernmentCatalogGoalLabel,
	getGovernmentCatalogNodes,
	getGovernmentCatalogPrefill,
	getGovernmentCatalogStats,
	getGovernmentCatalogSubjectLabel,
	getGovernmentCatalogTeamLabel,
	getGovernmentOrderTargetTeams,
	isGameFinished,
	isTerminalGameEvent,
	matchesGovernmentCatalogSearch,
	validateGovernmentOrderAgainstCatalog,
	validateGovernmentOrderPayload,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	AlertTriangle,
	BookOpen,
	CircleGauge,
	Command,
	Flag,
	Landmark,
	LoaderCircle,
	LockKeyhole,
	LogOut,
	Megaphone,
	RefreshCw,
	ScrollText,
	Target,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CommunicationPanel } from "@/components/v2/CommunicationPanel";
import { GameEventFeed } from "@/components/v2/GameEventFeed";
import { GameFinishedResult } from "@/components/v2/GameFinishedResult";
import { GovernmentCatalogPanel } from "@/components/v2/government/GovernmentCatalogPanel";
import { LockReasonsDialog } from "@/components/v2/LockReasonsDialog";
import { useGameEvents } from "@/hooks/useGameEvents";
import { useGovernmentCatalog } from "@/hooks/useGovernmentCatalog";
import { useGovernmentOrders } from "@/hooks/useGovernmentOrders";
import { useGovernmentOverview } from "@/hooks/useGovernmentOverview";
import { useLockReasons } from "@/hooks/useLockReasons";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { createCommunicationService } from "@/lib/communicationService";
import {
	buildGovernmentOrder,
	createGovernmentRuntimeApi,
} from "@/lib/governmentRuntimeApi";
import {
	formatOrderTypeFa,
	formatPhaseFa,
	getLocalized,
	orderTypeNeedsSubject,
	translateSubjectStatusFa,
} from "@/lib/runtimeTranslationsFa";
import { useAuthStore } from "@/store/auth.store";

const ORDER_TYPES: GovernmentOrderType[] = [
	"ASSIGN_SUBJECT",
	"FORCE_SUBJECT",
	"ALLOCATE_CREDIT",
	"BAN_ACTION",
	"UNBAN_ACTION",
	"DISABLE_TEAM",
	"ENABLE_TEAM",
];

const ORDER_GUIDE: Record<
	GovernmentOrderType,
	{ title: string; description: string; input: string }
> = {
	ASSIGN_SUBJECT: {
		title: "تخصیص موضوع",
		description: "موضوع را به فهرست موضوع‌های قابل‌استفاده تیم اضافه می‌کند.",
		input: "شناسه موضوع از نوع SUBJ_…؛ کدهای ATK_… و DEF_… موضوع نیستند.",
	},
	FORCE_SUBJECT: {
		title: "اجبار به موضوع",
		description:
			"موضوع فعال تیم را عوض می‌کند و پیشرفت قبلی مسیرها را نگه می‌دارد.",
		input: "یکی از موضوع‌های معتبر هدف انتخاب‌شده سمت.",
	},
	ALLOCATE_CREDIT: {
		title: "تخصیص اعتبار",
		description:
			"عدد مثبت اعتبار اضافه و عدد منفی اعتبار کم می‌کند؛ اعتبار کمتر از صفر نمی‌شود.",
		input: "مقدار عددی؛ برای نمونه ۵۰ یا ‎-۲۰.",
	},
	BAN_ACTION: {
		title: "ممنوع‌کردن کنش",
		description: "کنش انتخاب‌شده را برای سمت شما، به مدت مشخص، ممنوع می‌کند.",
		input: "کد کنش واقعی از فهرست زنده بازی و مدت بر حسب نوبت.",
	},
	UNBAN_ACTION: {
		title: "رفع ممنوعیت کنش",
		description: "ممنوعیت کنش انتخاب‌شده را برمی‌دارد.",
		input: "کد همان کنشی که قبلاً ممنوع شده است.",
	},
	DISABLE_TEAM: {
		title: "غیرفعال‌کردن تیم",
		description: "اجرای کنش‌های تیم را برای تعداد مشخصی نوبت متوقف می‌کند.",
		input: "مدت و یک دلیل فارسی کوتاه برای اعضای تیم.",
	},
	ENABLE_TEAM: {
		title: "فعال‌کردن تیم",
		description: "محدودیت غیرفعال‌بودن تیم را پایان می‌دهد.",
		input: "فقط تیم هدف لازم است.",
	},
};

const teamRoleFa = (role: string | null | undefined): string => {
	if (role === "ATTACKER") return "مهاجم";
	if (role === "DEFENCER") return "مدافع";
	if (role === "BOTH") return "ترکیبی";
	if (role === "GOVERNMENT") return "دولت";
	return "تیم";
};

const orderPayloadSummaryFa = (order: OrderView): string => {
	const { payload } = order;
	if (order.order_type === "ASSIGN_SUBJECT")
		return `موضوع تخصیص‌یافته: ${String(payload.subject_id ?? "—")}`;
	if (order.order_type === "FORCE_SUBJECT")
		return `موضوع اجباری: ${String(payload.subject_id ?? "—")}`;
	if (order.order_type === "ALLOCATE_CREDIT")
		return `تغییر اعتبار: ${Number(payload.amount ?? 0).toLocaleString("fa-IR")}`;
	if (order.order_type === "BAN_ACTION")
		return `کنش: ${String(payload.action_code ?? "—")} · مدت: ${String(payload.duration ?? 1)} نوبت`;
	if (order.order_type === "UNBAN_ACTION")
		return `رفع ممنوعیت: ${String(payload.action_code ?? "—")}`;
	if (order.order_type === "DISABLE_TEAM")
		return `مدت: ${String(payload.duration ?? 1)} نوبت · دلیل: ${String(payload.reason ?? "ثبت نشده")}`;
	return "تیم دوباره فعال شد.";
};

const PUBLIC_ANNOUNCEMENTS_ALLOWED =
	process.env.NEXT_PUBLIC_COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS === "true";

const eventTypeHas = (type: string, terms: string[]): boolean =>
	terms.some((term) => type.includes(term));

export default function GovernmentDashboardPage() {
	const { token, user, clearAuth } = useAuthStore();
	const api = useMemo(() => createGovernmentRuntimeApi(token ?? ""), [token]);
	const runtime = useGovernmentOverview(api, Boolean(token));
	const gameId = runtime.context?.gameId ?? null;
	const catalogResource = useGovernmentCatalog(api, Boolean(token), gameId);
	const catalog = catalogResource.catalog;
	const turn = runtime.context?.currentTurn ?? undefined;
	const ordersResource = useGovernmentOrders(
		api,
		turn,
		Boolean(token && runtime.overview),
	);
	const [selectedTeam, setSelectedTeam] =
		useState<GovernmentTeamProgress | null>(null);
	const [goalId, setGoalId] = useState("");
	const [orderType, setOrderType] =
		useState<GovernmentOrderType>("ASSIGN_SUBJECT");
	const [targetTeamId, setTargetTeamId] = useState(0);
	const [subjectId, setSubjectId] = useState("");
	const [actionCode, setActionCode] = useState("");
	const [amount, setAmount] = useState(10);
	const [duration, setDuration] = useState(1);
	const [reason, setReason] = useState("");
	const [lockNodeId, setLockNodeId] = useState("");
	const [subjectSearch, setSubjectSearch] = useState("");
	const [actionSearch, setActionSearch] = useState("");
	const [nodeSearch, setNodeSearch] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	const gameState = runtime.context?.gameState ?? null;
	const stateFinished = isGameFinished(gameState?.game);
	const events = useGameEvents(gameId, token, !stateFinished);
	const terminalEventReceived = events.events.some(isTerminalGameEvent);
	const runtimeTeams = runtime.context?.teams ?? [];
	const orderTargetTeams = useMemo(
		() => (catalog ? getGovernmentOrderTargetTeams(catalog) : []),
		[catalog],
	);
	const subjectOptions = useMemo(
		() =>
			(catalog?.subjects ?? [])
				.filter((subject) =>
					matchesGovernmentCatalogSearch(
						subjectSearch,
						subject.id,
						subject.title,
						subject.title_fa,
					),
				)
				.sort((first, second) =>
					getGovernmentCatalogSubjectLabel(first).localeCompare(
						getGovernmentCatalogSubjectLabel(second),
						"fa",
					),
				),
		[catalog?.subjects, subjectSearch],
	);
	const actionOptions = useMemo(
		() =>
			(catalog?.bannable_actions ?? [])
				.filter((action) =>
					matchesGovernmentCatalogSearch(
						actionSearch,
						action.code,
						action.name,
						action.name_fa,
					),
				)
				.sort((first, second) =>
					getGovernmentCatalogActionLabel(first).localeCompare(
						getGovernmentCatalogActionLabel(second),
						"fa",
					),
				),
		[catalog?.bannable_actions, actionSearch],
	);
	const subjectGroups = useMemo(() => {
		const availableIds = new Set(subjectOptions.map((subject) => subject.id));
		const groups = (catalog?.goals ?? []).flatMap((goal) => {
			const subjects = (catalog?.subjects ?? []).filter(
				(subject) =>
					subject.goal_id === goal.id && availableIds.has(subject.id),
			);
			return subjects.length > 0 ? [{ goal, subjects }] : [];
		});
		const groupedIds = new Set(
			groups.flatMap((group) => group.subjects.map((subject) => subject.id)),
		);
		const ungrouped = subjectOptions.filter(
			(subject) => !groupedIds.has(subject.id),
		);
		return ungrouped.length > 0
			? [
					...groups,
					{
						goal: { id: "ungrouped", title: "سایر موضوع‌ها" },
						subjects: ungrouped,
					},
				]
			: groups;
	}, [catalog?.goals, catalog?.subjects, subjectOptions]);
	const nodeOptions = useMemo(
		() =>
			catalog
				? getGovernmentCatalogNodes(catalog).filter((node) =>
						matchesGovernmentCatalogSearch(
							nodeSearch,
							node.id,
							node.label,
							node.searchText,
						),
					)
				: [],
		[catalog, nodeSearch],
	);
	const catalogStats = useMemo(
		() => (catalog ? getGovernmentCatalogStats(catalog) : null),
		[catalog],
	);
	const selectedRuntimeTeam = runtimeTeams.find(
		(team) => team.id === targetTeamId,
	);
	const orderReady =
		Boolean(catalog && targetTeamId) &&
		(!orderTypeNeedsSubject(orderType) || Boolean(subjectId)) &&
		((orderType !== "BAN_ACTION" && orderType !== "UNBAN_ACTION") ||
			Boolean(actionCode));

	useEffect(() => {
		if (!runtime.overview || !catalog) return;
		setGoalId(
			catalog.goals.some((goal) => goal.id === runtime.overview?.goal_id)
				? (runtime.overview.goal_id ?? "")
				: (catalog.goals[0]?.id ?? ""),
		);
		const firstTeam = orderTargetTeams[0] ?? null;
		setTargetTeamId((current) =>
			orderTargetTeams.some((team) => team.id === current)
				? current
				: (firstTeam?.id ?? 0),
		);
		setSelectedTeam(
			(current) =>
				(runtime.overview?.teams.some(
					(team) => team.team_id === current?.team_id,
				)
					? current
					: runtime.overview?.teams.find(
							(team) => team.team_id === firstTeam?.id,
						)) ?? null,
		);
	}, [catalog, orderTargetTeams, runtime.overview]);

	useEffect(() => {
		if (orderTypeNeedsSubject(orderType) && subjectOptions.length > 0) {
			setSubjectId((current) =>
				subjectOptions.some((subject) => subject.id === current)
					? current
					: (subjectOptions[0]?.id ?? ""),
			);
		}
		if (
			(orderType === "BAN_ACTION" || orderType === "UNBAN_ACTION") &&
			actionOptions.length > 0
		) {
			setActionCode((current) =>
				actionOptions.some((action) => action.code === current)
					? current
					: (actionOptions[0]?.code ?? ""),
			);
		}
	}, [actionOptions, orderType, subjectOptions]);

	const loadGovernmentLockReasons = useCallback(
		(nodeId: string) => api.getLockReasons(targetTeamId, nodeId),
		[api, targetTeamId],
	);
	const locks = useLockReasons(loadGovernmentLockReasons);
	const exitGovernment = useCallback(() => {
		clearAuth();
		toast.success("از پنل دولت خارج شدید.");
	}, [clearAuth]);

	const communicationService = useMemo(
		() =>
			createCommunicationService({
				token: token ?? "",
				gameId: gameId ?? "active-game",
				senderUserId: user?.id ?? 0,
				senderTeamId: runtime.context?.teamId ?? 0,
				senderSideId:
					runtime.overview?.side_id ?? runtime.context?.sideId ?? undefined,
				senderRole: "GOVERNMENT",
				turn: turn ?? 0,
				phase: runtime.context?.currentPhase ?? undefined,
				permissions: {
					allowPublicAnnouncements: PUBLIC_ANNOUNCEMENTS_ALLOWED,
				},
				ownSideTeamIds: runtime.overview?.teams.map((team) => team.team_id),
			}),
		[
			gameId,
			runtime.context?.currentPhase,
			runtime.context?.sideId,
			runtime.context?.teamId,
			runtime.overview,
			token,
			turn,
			user?.id,
		],
	);

	const selectTeam = async (teamId: number) => {
		setBusy(`team-${teamId}`);
		try {
			setSelectedTeam(await api.getTeamProgress(teamId));
			setTargetTeamId(teamId);
		} catch (requestError) {
			toast.error(
				parseRuntimeApiError(requestError, "دریافت پیشرفت تیم ناموفق بود.")
					.message,
			);
		} finally {
			setBusy(null);
		}
	};

	const submitGoal = async () => {
		if (!catalog) {
			toast.error("کاتالوگ در دسترس نیست.");
			return;
		}
		if (!catalog.goals.some((goal) => goal.id === goalId)) {
			toast.error("هدف انتخاب‌شده در کاتالوگ سمت شما وجود ندارد.");
			return;
		}
		setBusy("goal");
		try {
			await api.selectGoal(goalId);
			toast.success("هدف دولت انتخاب شد.");
			await runtime.refresh();
		} catch (requestError) {
			toast.error(
				parseRuntimeApiError(requestError, "انتخاب هدف ناموفق بود.").message,
			);
		} finally {
			setBusy(null);
		}
	};

	const submitOrder = async () => {
		if (!catalog) {
			toast.error("کاتالوگ در دسترس نیست.");
			return;
		}
		if (!Number.isFinite(amount) && orderType === "ALLOCATE_CREDIT") {
			toast.error("مقدار اعتبار باید عددی باشد.");
			return;
		}
		if (
			(orderType === "BAN_ACTION" || orderType === "DISABLE_TEAM") &&
			(!Number.isFinite(duration) || duration <= 0)
		) {
			toast.error("مدت باید یک عدد مثبت باشد.");
			return;
		}
		const order = buildGovernmentOrder({
			type: orderType,
			teamId: targetTeamId,
			subjectId,
			actionCode,
			amount,
			duration,
			reason,
		});
		const validation = validateGovernmentOrderPayload(order);
		if (!validation.valid) {
			toast.error(validation.message);
			return;
		}
		const catalogValidation = validateGovernmentOrderAgainstCatalog(
			catalog,
			order,
		);
		if (!catalogValidation.valid) {
			toast.error(catalogValidation.message);
			return;
		}
		setBusy("order");
		try {
			await api.issueOrder(order);
			toast.success("دستور دولت با موفقیت صادر شد.");
			await Promise.all([
				ordersResource.refresh(),
				runtime.refresh(),
				selectedTeam
					? api.getTeamProgress(selectedTeam.team_id).then(setSelectedTeam)
					: Promise.resolve(),
			]);
		} catch (requestError) {
			toast.error(
				parseRuntimeApiError(requestError, "صدور دستور ناموفق بود.").message,
			);
		} finally {
			setBusy(null);
		}
	};

	const prefillSubjectOrder = (nextSubjectId: string) => {
		const prefill = getGovernmentCatalogPrefill(
			"subject",
			nextSubjectId,
			orderType,
		);
		setOrderType(prefill.orderType);
		setSubjectId(prefill.subjectId ?? "");
		toast.success("موضوع در فرم دستور قرار گرفت.");
	};

	const prefillActionOrder = (nextActionCode: string) => {
		const prefill = getGovernmentCatalogPrefill(
			"action",
			nextActionCode,
			orderType,
		);
		setOrderType(prefill.orderType);
		setActionCode(prefill.actionCode ?? "");
		toast.success("کنش در فرم ممنوعیت قرار گرفت.");
	};

	const prefillLockNode = (nodeId: string) => {
		setLockNodeId(nodeId);
		toast.success("گام برای بررسی دلایل قفل انتخاب شد.");
	};

	const latestEventSeq = events.events[0]?.seq ?? 0;
	const latestEventType = events.events[0]?.type ?? "";
	const selectedTeamId = selectedTeam?.team_id ?? null;
	const refreshOverview = runtime.refresh;
	const refreshOrders = ordersResource.refresh;
	useEffect(() => {
		if (latestEventSeq === 0) return;
		if (
			eventTypeHas(latestEventType, [
				"TURN",
				"PHASE",
				"GAME",
				"GOVERNMENT_ORDER",
				"GOVERNMENT_SELECTION",
				"GOVERNMENT_INTERVENTION",
				"GOVERNMENT_ALERT",
				"SCENARIO",
				"STEP",
				"CREDITS",
				"POINTS",
				"TEAM_STATE_CHANGED",
				"TEAM_READY",
				"ALL_TEAMS_READY",
				"VOTE",
				"VOTING",
				"CALCULATION",
			])
		) {
			void refreshOverview();
		}
		if (eventTypeHas(latestEventType, ["GOVERNMENT_ORDER", "TURN"])) {
			void refreshOrders();
		}
		if (
			selectedTeamId &&
			eventTypeHas(latestEventType, [
				"GOVERNMENT_ORDER",
				"TURN",
				"SCENARIO",
				"STEP",
				"CREDITS",
				"POINTS",
				"TEAM_ACTION",
				"TEAM_TARGET",
				"TEAM_MAJORITY",
				"TEAM_STATE_CHANGED",
			])
		) {
			void api.getTeamProgress(selectedTeamId).then(setSelectedTeam);
		}
	}, [
		api,
		latestEventSeq,
		latestEventType,
		refreshOrders,
		refreshOverview,
		selectedTeamId,
	]);

	if (!token) {
		return (
			<main className="grid min-h-screen place-items-center bg-[#090b13] p-6 text-slate-100">
				<Card className="max-w-md border-white/10 bg-slate-950/70 text-center text-slate-100">
					<CardContent className="p-8">
						<Landmark className="mx-auto size-12 text-amber-300" />
						<h1 className="mt-4 text-xl font-black">ورود دولت لازم است</h1>
						<p className="mt-2 text-sm leading-7 text-slate-400">
							این مرکز فقط برای تیمی با نقش GOVERNMENT قابل استفاده است.
						</p>
						<Link href="/login">
							<Button className="mt-5 bg-amber-400 text-slate-950">
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
				onExit={exitGovernment}
			/>
		);
	}

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#090b13] text-slate-100 [background-image:radial-gradient(circle_at_15%_0%,rgba(245,158,11,.14),transparent_25%),radial-gradient(circle_at_85%_10%,rgba(8,145,178,.12),transparent_24%)]">
			<div className="relative mx-auto max-w-[1550px] space-y-5 px-4 py-5 lg:px-7">
				<header className="rounded-[26px] border border-amber-400/15 bg-slate-950/70 p-5 backdrop-blur-xl">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
								<Landmark className="size-7" />
							</div>
							<div>
								<div className="text-xs text-amber-300">
									مرکز فرماندهی سمت {runtime.overview?.side_id ?? "—"}
								</div>
								<h1 className="mt-1 text-2xl font-black">فرماندهی دولت</h1>
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
							<Badge className="border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-amber-200">
								هدف: {runtime.overview?.goal_id ?? "انتخاب نشده"}
							</Badge>
							{runtime.context?.currentPhase && (
								<Badge className="border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-cyan-200">
									{formatPhaseFa(runtime.context.currentPhase)}
								</Badge>
							)}
							<Button
								variant="outline"
								onClick={() =>
									void Promise.all([
										runtime.refresh(),
										catalogResource.refetch(),
									])
								}
								disabled={runtime.loading || catalogResource.isLoading}
								className="border-white/10 bg-white/5"
							>
								<RefreshCw
									className={`size-4 ${runtime.loading || catalogResource.isLoading ? "animate-spin" : ""}`}
								/>{" "}
								به‌روزرسانی کاتالوگ
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={exitGovernment}
								className="border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200"
							>
								<LogOut className="size-4" /> خروج
							</Button>
						</div>
					</div>
				</header>

				{runtime.error && (
					<div className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
						<AlertTriangle className="size-5" /> {runtime.error}
					</div>
				)}
				{catalogResource.error && (
					<div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
						<div className="flex gap-3">
							<AlertTriangle className="size-5" /> {catalogResource.error}
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={() => void catalogResource.refetch()}
							className="border-rose-300/20 bg-rose-950/20"
						>
							دریافت کاتالوگ
						</Button>
					</div>
				)}
				{(runtime.loading && !runtime.overview) ||
				(catalogResource.isLoading && !catalog) ? (
					<div className="grid min-h-[60vh] place-items-center">
						<div className="text-center">
							<LoaderCircle className="mx-auto size-10 animate-spin text-amber-300" />
							<div className="mt-3 text-sm text-slate-400">
								در حال دریافت کاتالوگ دولت…
							</div>
						</div>
					</div>
				) : catalog ? (
					<div className="space-y-5">
						<section className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
							<Card className="border-amber-400/15 bg-slate-950/60 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Target className="size-5 text-amber-300" /> انتخاب هدف سمت
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{catalog.goals.length > 0 ? (
										<Select value={goalId} onValueChange={setGoalId}>
											<SelectTrigger className="w-full border-white/10 bg-white/5">
												<SelectValue placeholder="هدف‌های قابل انتخاب" />
											</SelectTrigger>
											<SelectContent>
												{catalog.goals.map((goal) => (
													<SelectItem key={goal.id} value={goal.id}>
														{getGovernmentCatalogGoalLabel(goal)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
											هدفی برای سمت شما در کاتالوگ وجود ندارد.
										</p>
									)}
									<Button
										onClick={() => void submitGoal()}
										disabled={
											!goalId || busy !== null || catalog.goals.length === 0
										}
										className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
									>
										{busy === "goal" ? (
											<LoaderCircle className="size-4 animate-spin" />
										) : (
											<Flag className="size-4" />
										)}{" "}
										ثبت هدف
									</Button>
								</CardContent>
							</Card>
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								<div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4">
									<div className="text-xs text-slate-500">تعداد هدف‌ها</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.goals ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4">
									<div className="text-xs text-slate-500">تعداد موضوع‌ها</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.subjects ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-violet-400/15 bg-violet-500/5 p-4">
									<div className="text-xs text-slate-500">تعداد تیم‌های سمت</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.teams ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
									<div className="text-xs text-slate-500">
										کنش‌های قابل ممنوعیت
									</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.actions ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-orange-400/15 bg-orange-500/5 p-4">
									<div className="text-xs text-slate-500">تعداد سناریوها</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.scenarios ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-rose-400/15 bg-rose-500/5 p-4">
									<div className="text-xs text-slate-500">تعداد گام‌ها</div>
									<div className="mt-2 text-xl font-black">
										{catalogStats?.steps ?? 0}
									</div>
								</div>
							</div>
						</section>

						<section>
							<div className="mb-3 flex items-center gap-2 font-black">
								<Users className="size-5 text-cyan-300" /> نمای کلی و پیشرفت
								تیم‌ها
							</div>
							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
								{runtime.overview?.teams.map((team) => {
									const catalogTeam = catalog.teams.find(
										(candidate) => candidate.id === team.team_id,
									);
									const average =
										team.assigned_subjects.length > 0
											? team.assigned_subjects.reduce(
													(sum, subject) => sum + subject.progress_percent,
													0,
												) / team.assigned_subjects.length
											: 0;
									return (
										<button
											key={team.team_id}
											type="button"
											onClick={() => void selectTeam(team.team_id)}
											className={`rounded-2xl border p-4 text-right transition ${selectedTeam?.team_id === team.team_id ? "border-amber-400/40 bg-amber-500/10" : "border-white/8 bg-slate-950/55 hover:bg-white/[0.05]"}`}
										>
											<div className="flex items-center justify-between">
												<div>
													<div className="font-black">
														{catalogTeam
															? getGovernmentCatalogTeamLabel(catalogTeam)
															: `تیم ${team.team_id}`}
													</div>
													<div className="mt-1 text-[10px] text-slate-500">
														{teamRoleFa(catalogTeam?.role?.type)} ·{" "}
														{team.team_id}
													</div>
												</div>
												{busy === `team-${team.team_id}` ? (
													<LoaderCircle className="size-4 animate-spin" />
												) : (
													<CircleGauge className="size-5 text-cyan-300" />
												)}
											</div>
											<div className="mt-4 flex justify-between text-xs text-slate-400">
												<span>میانگین پیشرفت</span>
												<span>{Math.round(average)}٪</span>
											</div>
											<Progress className="mt-2" value={average} />
											<div className="mt-3 text-xs text-slate-500">
												{team.assigned_subjects.length} موضوع محول‌شده
											</div>
										</button>
									);
								})}
							</div>
						</section>

						<GovernmentCatalogPanel
							catalog={catalog}
							onSelectSubject={prefillSubjectOrder}
							onSelectAction={prefillActionOrder}
							onSelectNode={prefillLockNode}
						/>

						<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
							<div className="space-y-5">
								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<CircleGauge className="size-5 text-cyan-300" /> پیشرفت
											تیم منتخب
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-3 md:grid-cols-2">
										{selectedTeam?.assigned_subjects.length ? (
											selectedTeam.assigned_subjects.map((subject) => (
												<div
													key={subject.id}
													className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
												>
													<div className="flex items-start justify-between gap-2">
														<div className="font-bold">
															{getLocalized(subject.title, subject.title_fa)}
														</div>
														<Badge
															className={
																subject.status === "stalled"
																	? "bg-orange-500/15 text-orange-200"
																	: "bg-cyan-500/15 text-cyan-200"
															}
														>
															{translateSubjectStatusFa(subject.status)}
														</Badge>
													</div>
													<div className="mt-3 flex justify-between text-xs">
														<span className="text-slate-500">پیشرفت</span>
														<strong>{subject.progress_percent}٪</strong>
													</div>
													<Progress
														value={subject.progress_percent}
														className="mt-2"
													/>
													<div className="mt-3 flex flex-wrap gap-1">
														{subject.sub_subjects?.map((sub) => (
															<span
																key={sub.id}
																className={`rounded px-2 py-1 text-[10px] ${sub.completed ? "bg-emerald-500/10 text-emerald-200" : "bg-white/5 text-slate-500"}`}
															>
																{sub.id} · {sub.progress_share}٪{" "}
																{sub.completed && "✓"}
															</span>
														))}
													</div>
												</div>
											))
										) : (
											<div className="col-span-full rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
												تیمی را انتخاب کنید یا هنوز موضوعی محول نشده است.
											</div>
										)}
									</CardContent>
								</Card>

								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<Command className="size-5 text-amber-300" /> صدور دستور
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.06] p-4">
											<div className="flex flex-wrap items-center gap-2">
												<Badge className="bg-amber-500/15 text-amber-100">
													{ORDER_GUIDE[orderType].title}
												</Badge>
												<code dir="ltr" className="text-[10px] text-slate-500">
													{orderType}
												</code>
											</div>
											<p className="mt-2 text-sm leading-7 text-slate-200">
												{ORDER_GUIDE[orderType].description}
											</p>
											<p className="mt-1 text-xs leading-6 text-slate-500">
												ورودی لازم: {ORDER_GUIDE[orderType].input}
											</p>
										</div>
										<div className="grid gap-3 md:grid-cols-2">
											<Select
												value={orderType}
												onValueChange={(value) =>
													setOrderType(value as GovernmentOrderType)
												}
											>
												<SelectTrigger className="border-white/10 bg-white/5">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{ORDER_TYPES.map((type) => (
														<SelectItem key={type} value={type}>
															{formatOrderTypeFa(type)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<Select
												value={targetTeamId ? String(targetTeamId) : undefined}
												onValueChange={(value) =>
													setTargetTeamId(Number(value))
												}
											>
												<SelectTrigger className="w-full border-white/10 bg-white/5">
													<SelectValue placeholder="تیم هدف دستور" />
												</SelectTrigger>
												<SelectContent>
													{orderTargetTeams.map((team) => (
														<SelectItem key={team.id} value={String(team.id)}>
															{getGovernmentCatalogTeamLabel(team)} ·{" "}
															{teamRoleFa(team.role?.type)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										{orderTypeNeedsSubject(orderType) && (
											<div className="space-y-2">
												<Input
													value={subjectSearch}
													onChange={(event) =>
														setSubjectSearch(event.target.value)
													}
													placeholder="جست‌وجوی عنوان فارسی، انگلیسی یا شناسه موضوع"
													className="border-white/10 bg-white/5"
												/>
												{subjectOptions.length > 0 ? (
													<Select
														value={subjectId}
														onValueChange={setSubjectId}
													>
														<SelectTrigger className="w-full border-white/10 bg-white/5">
															<SelectValue placeholder="موضوع‌های قابل تخصیص" />
														</SelectTrigger>
														<SelectContent>
															{subjectGroups.map((group) => (
																<SelectGroup key={group.goal.id}>
																	<SelectLabel>
																		{getGovernmentCatalogGoalLabel(group.goal)}
																	</SelectLabel>
																	{group.subjects.map((subject) => (
																		<SelectItem
																			key={subject.id}
																			value={subject.id}
																		>
																			{getGovernmentCatalogSubjectLabel(
																				subject,
																			)}{" "}
																			· {subject.id}
																		</SelectItem>
																	))}
																</SelectGroup>
															))}
														</SelectContent>
													</Select>
												) : (
													<p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
														موضوعی با این جست‌وجو در کاتالوگ پیدا نشد.
													</p>
												)}
											</div>
										)}
										{(orderType === "BAN_ACTION" ||
											orderType === "UNBAN_ACTION") && (
											<div className="space-y-2">
												<Input
													value={actionSearch}
													onChange={(event) =>
														setActionSearch(event.target.value)
													}
													placeholder="جست‌وجوی نام فارسی، انگلیسی یا کد کنش"
													className="border-white/10 bg-white/5"
												/>
												{actionOptions.length > 0 ? (
													<Select
														value={actionCode}
														onValueChange={setActionCode}
													>
														<SelectTrigger className="w-full border-white/10 bg-white/5">
															<SelectValue placeholder="کنش‌های قابل ممنوعیت" />
														</SelectTrigger>
														<SelectContent>
															{actionOptions.map((action) => (
																<SelectItem
																	key={action.code}
																	value={action.code}
																>
																	{getGovernmentCatalogActionLabel(action)} ·{" "}
																	{action.code} ·{" "}
																	{action.type === "attack"
																		? "تهاجمی"
																		: "دفاعی"}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
														کنشی با این جست‌وجو در کاتالوگ پیدا نشد.
													</p>
												)}
												<p className="text-xs leading-6 text-slate-500">
													این فهرست فقط از{" "}
													<span dir="ltr">/government/catalog</span> گرفته
													می‌شود.
												</p>
											</div>
										)}
										{orderType === "ALLOCATE_CREDIT" && (
											<div className="space-y-2">
												<Input
													type="number"
													value={amount}
													onChange={(event) =>
														setAmount(Number(event.target.value))
													}
													placeholder="مقدار اعتبار"
													className="border-white/10 bg-white/5"
												/>
												<p className="text-xs text-slate-500">
													اعتبار فعلی تیم:{" "}
													{selectedRuntimeTeam?.credits ?? "نامشخص"} · نتیجه
													تقریبی:{" "}
													{selectedRuntimeTeam?.credits !== undefined
														? Math.max(0, selectedRuntimeTeam.credits + amount)
														: "—"}
												</p>
											</div>
										)}
										{(orderType === "BAN_ACTION" ||
											orderType === "DISABLE_TEAM") && (
											<Input
												type="number"
												min={1}
												value={duration}
												onChange={(event) =>
													setDuration(Number(event.target.value))
												}
												placeholder="مدت به نوبت"
												className="border-white/10 bg-white/5"
											/>
										)}
										{orderType === "DISABLE_TEAM" && (
											<Input
												value={reason}
												onChange={(event) => setReason(event.target.value)}
												placeholder="دلیل غیرفعال‌سازی"
												className="border-white/10 bg-white/5"
											/>
										)}
										<Button
											onClick={() => void submitOrder()}
											disabled={busy !== null || !orderReady}
											className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
										>
											{busy === "order" ? (
												<LoaderCircle className="size-4 animate-spin" />
											) : (
												<Megaphone className="size-4" />
											)}{" "}
											صدور دستور
										</Button>
									</CardContent>
								</Card>

								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<LockKeyhole className="size-5 text-orange-300" /> بررسی
											دلایل قفل
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<Select
											value={targetTeamId ? String(targetTeamId) : undefined}
											onValueChange={(value) => setTargetTeamId(Number(value))}
										>
											<SelectTrigger className="w-full border-white/10 bg-white/5">
												<SelectValue placeholder="تیم خودی" />
											</SelectTrigger>
											<SelectContent>
												{orderTargetTeams.map((team) => (
													<SelectItem key={team.id} value={String(team.id)}>
														{getGovernmentCatalogTeamLabel(team)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Input
											value={nodeSearch}
											onChange={(event) => setNodeSearch(event.target.value)}
											placeholder="جست‌وجوی گره، سناریو، گام یا کنش"
											className="border-white/10 bg-white/5"
										/>
										<Select value={lockNodeId} onValueChange={setLockNodeId}>
											<SelectTrigger className="w-full border-white/10 bg-white/5">
												<SelectValue placeholder="گره" />
											</SelectTrigger>
											<SelectContent>
												{nodeOptions.map((node) => (
													<SelectItem
														key={`${node.type}-${node.id}`}
														value={node.id}
													>
														{node.label} · {node.id}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Button
											variant="outline"
											onClick={() => void locks.inspect(lockNodeId.trim())}
											disabled={!targetTeamId || !lockNodeId.trim()}
											className="w-full border-orange-400/20 bg-orange-500/5"
										>
											<LockKeyhole className="size-4" /> مشاهده همه دلیل‌ها
										</Button>
									</CardContent>
								</Card>

								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<ScrollText className="size-5 text-violet-300" /> تاریخچه
											دستورها
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										{ordersResource.orders.length === 0 ? (
											<div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
												دستوری ثبت نشده است.
											</div>
										) : (
											ordersResource.orders.map((order, index) => (
												<div
													key={`${order.turn}-${order.target_team_id}-${index}`}
													className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
												>
													<div className="flex flex-wrap items-center gap-3">
														<Badge className="bg-amber-500/15 text-amber-200">
															{formatOrderTypeFa(order.order_type)}
														</Badge>
														<span className="text-sm">
															تیم {order.target_team_id}
														</span>
														<span className="text-xs text-slate-500">
															نوبت {order.turn}
														</span>
														{order.forced && (
															<Badge className="bg-rose-500/15 text-rose-200">
																اجباری
															</Badge>
														)}
													</div>
													<div className="mt-2 text-xs leading-6 text-slate-400">
														{orderPayloadSummaryFa(order)}
													</div>
												</div>
											))
										)}
									</CardContent>
								</Card>
							</div>

							<aside className="space-y-5">
								<GameEventFeed
									events={events.events}
									status={events.status}
									error={events.error}
								/>
								<CommunicationPanel
									service={communicationService}
									gameId={gameId ?? "active-game"}
									senderUserId={user?.id ?? 0}
									senderRole="GOVERNMENT"
									senderTeamId={runtime.context?.teamId ?? 0}
									senderSideId={
										runtime.overview?.side_id ??
										runtime.context?.sideId ??
										undefined
									}
									phase={runtime.context?.currentPhase ?? undefined}
									canSendPublicAnnouncements={PUBLIC_ANNOUNCEMENTS_ALLOWED}
									ownSideTeams={orderTargetTeams.map((team) => ({
										teamId: team.id,
										label: getGovernmentCatalogTeamLabel(team),
									}))}
									relatedScenarioId={null}
								/>
							</aside>
						</section>
					</div>
				) : (
					<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
						کاتالوگ در دسترس نیست.
					</div>
				)}
			</div>

			<LockReasonsDialog
				open={locks.reasons !== null}
				nodeId={locks.nodeId}
				reasons={locks.reasons}
				loading={locks.loading}
				error={locks.error}
				onClose={locks.close}
				title={`دلایل قفل برای تیم ${targetTeamId || "—"}`}
			/>
		</main>
	);
}
