"use client";

import type {
	GovernmentOrder,
	GovernmentOrderType,
	GovernmentOverviewResponse,
	GovernmentTeamProgress,
	LockReason,
	OrderView,
} from "@workspace/trpc";
import {
	formatLockReasonFa,
	formatOrderTypeFa,
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
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	AlertTriangle,
	CheckCircle2,
	CircleGauge,
	Coins,
	Command,
	Flag,
	GitBranch,
	Landmark,
	LoaderCircle,
	LockKeyhole,
	Megaphone,
	RefreshCw,
	ScrollText,
	ShieldCheck,
	Target,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CommunicationPanel } from "@/components/v2/CommunicationPanel";
import { GameEventFeed } from "@/components/v2/GameEventFeed";
import { useGameEvents } from "@/hooks/useGameEvents";
import { createLocalCommunicationService } from "@/lib/communicationService";
import {
	createSubjectScenarioApi,
	validateGovernmentOrderPayload,
} from "@/lib/subjectScenarioApi";
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

const buildOrder = (input: {
	type: GovernmentOrderType;
	teamId: number;
	subjectId: string;
	actionCode: string;
	amount: number;
	duration: number;
	reason: string;
}): GovernmentOrder => {
	switch (input.type) {
		case "ASSIGN_SUBJECT":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { subject_id: input.subjectId },
			};
		case "FORCE_SUBJECT":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { subject_id: input.subjectId },
			};
		case "ALLOCATE_CREDIT":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { amount: input.amount },
			};
		case "BAN_ACTION":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { action_code: input.actionCode, duration: input.duration },
			};
		case "UNBAN_ACTION":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: { action_code: input.actionCode },
			};
		case "DISABLE_TEAM":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: {
					duration: input.duration,
					reason: input.reason || undefined,
				},
			};
		case "ENABLE_TEAM":
			return {
				order_type: input.type,
				target_team_id: input.teamId,
				payload: {},
			};
	}
};

export default function GovernmentDashboardPage() {
	const { token, user } = useAuthStore();
	const api = useMemo(() => createSubjectScenarioApi(token ?? ""), [token]);
	const [overview, setOverview] = useState<GovernmentOverviewResponse | null>(
		null,
	);
	const [selectedTeam, setSelectedTeam] =
		useState<GovernmentTeamProgress | null>(null);
	const [orders, setOrders] = useState<OrderView[]>([]);
	const [gameId, setGameId] = useState<string | null>(null);
	const [turn, setTurn] = useState(0);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState<string | null>(null);
	const [pageError, setPageError] = useState<string | null>(null);
	const [goalId, setGoalId] = useState("");
	const [orderType, setOrderType] =
		useState<GovernmentOrderType>("ASSIGN_SUBJECT");
	const [targetTeamId, setTargetTeamId] = useState<number>(0);
	const [subjectId, setSubjectId] = useState("");
	const [actionCode, setActionCode] = useState("");
	const [amount, setAmount] = useState(10);
	const [duration, setDuration] = useState(1);
	const [reason, setReason] = useState("");
	const [lockNodeId, setLockNodeId] = useState("");
	const [lockReasons, setLockReasons] = useState<LockReason[] | null>(null);
	const events = useGameEvents(gameId, token);

	const communicationService = useMemo(
		() =>
			createLocalCommunicationService({
				gameId: gameId ?? "active-game",
				senderUserId: user?.id ?? 0,
				senderTeamId: 0,
				senderRole: "GOVERNMENT",
				turn,
			}),
		[gameId, turn, user?.id],
	);

	const refresh = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setPageError(null);
		try {
			const [nextOverview, legacyState] = await Promise.all([
				api.getGovernmentOverview(),
				api.getGameState().catch(() => null),
			]);
			setOverview(nextOverview);
			setGoalId(nextOverview.goal_id ?? "");
			setTargetTeamId(
				(current) => current || nextOverview.teams[0]?.team_id || 0,
			);
			if (nextOverview.teams[0])
				setSelectedTeam((current) => current ?? nextOverview.teams[0] ?? null);
			if (legacyState?.data) {
				setGameId(String(legacyState.data.game.gameId));
				setTurn(legacyState.data.game.currentTurn);
			}
			setOrders(
				await api
					.getGovernmentOrders(legacyState?.data.game.currentTurn)
					.catch(() => nextOverview.orders ?? []),
			);
		} catch (error) {
			setPageError(
				parseApiError(error, "دریافت نمای فرماندهی ممکن نشد.").message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, token]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const selectTeam = async (teamId: number) => {
		setBusy(`team-${teamId}`);
		try {
			setSelectedTeam(await api.getGovernmentTeamProgress(teamId));
			setTargetTeamId(teamId);
		} catch (error) {
			toast.error(
				parseApiError(error, "دریافت پیشرفت تیم ناموفق بود.").message,
			);
		} finally {
			setBusy(null);
		}
	};

	const submitGoal = async () => {
		if (!goalId.trim()) return;
		setBusy("goal");
		try {
			await api.selectGovernmentGoal(goalId.trim());
			toast.success("هدف سمت با موفقیت انتخاب شد.");
			await refresh();
		} catch (error) {
			toast.error(parseApiError(error, "انتخاب هدف ناموفق بود.").message);
		} finally {
			setBusy(null);
		}
	};

	const submitOrder = async () => {
		const order = buildOrder({
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
		setBusy("order");
		try {
			await api.issueGovernmentOrder(order);
			toast.success("دستور دولت با موفقیت صادر شد.");
			setOrders(await api.getGovernmentOrders(turn));
			if (selectedTeam)
				setSelectedTeam(
					await api.getGovernmentTeamProgress(selectedTeam.team_id),
				);
		} catch (error) {
			toast.error(parseApiError(error, "صدور دستور ناموفق بود.").message);
		} finally {
			setBusy(null);
		}
	};

	const inspectLock = async () => {
		if (!targetTeamId || !lockNodeId.trim()) return;
		setBusy("lock");
		try {
			const response = await api.getGovernmentLockReasons(
				targetTeamId,
				lockNodeId.trim(),
			);
			setLockReasons(response.reasons);
		} catch (error) {
			toast.error(parseApiError(error, "دریافت دلایل قفل ناموفق بود.").message);
		} finally {
			setBusy(null);
		}
	};

	if (!token)
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

	return (
		<main className="min-h-screen bg-[#090b13] text-slate-100 [background-image:radial-gradient(circle_at_15%_0%,rgba(245,158,11,.13),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(14,116,144,.12),transparent_23%)]">
			<div className="mx-auto max-w-[1550px] space-y-5 px-4 py-5 lg:px-7">
				<header className="rounded-[26px] border border-amber-400/15 bg-slate-950/70 p-5 backdrop-blur-xl">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
								<Command className="size-7" />
							</div>
							<div>
								<div className="text-xs text-amber-300">
									مرکز فرماندهی سمت {overview?.side_id ?? "—"}
								</div>
								<h1 className="mt-1 text-2xl font-black">اتاق عملیات دولت</h1>
								<p className="mt-1 text-xs text-slate-500">
									نمای راهبردی تیم‌ها، دستورها و رخدادهای قابل مشاهده
								</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge className="border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-amber-200">
								<Flag className="size-3.5" /> نوبت {turn || "—"}
							</Badge>
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
				</header>

				{pageError && (
					<div className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
						<AlertTriangle className="size-5 shrink-0" />
						{pageError}
					</div>
				)}
				{loading && !overview ? (
					<div className="grid min-h-[65vh] place-items-center">
						<LoaderCircle className="size-10 animate-spin text-amber-300" />
					</div>
				) : (
					<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
						<div className="space-y-5">
							<Card className="border-amber-400/15 bg-slate-950/60 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Target className="size-5 text-amber-300" /> هدف راهبردی سمت
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid gap-3 lg:grid-cols-[1fr_auto]">
										<div>
											<Input
												dir="ltr"
												value={goalId}
												onChange={(event) => setGoalId(event.target.value)}
												placeholder="شناسه هدف منتشرشده"
												className="border-white/10 bg-white/5"
											/>
											<p className="mt-2 text-xs leading-6 text-slate-500">
												قرارداد فعلی endpoint فهرست اهداف مجاز برای دولت ندارد؛
												این فیلد فقط شناسه‌ای را که از برنامه منتشرشده دریافت
												کرده‌اید به POST /government/goal می‌فرستد.
											</p>
										</div>
										<Button
											onClick={() => void submitGoal()}
											disabled={!goalId.trim() || busy !== null}
											className="bg-amber-400 text-slate-950 hover:bg-amber-300"
										>
											{busy === "goal" ? (
												<LoaderCircle className="size-4 animate-spin" />
											) : (
												<Flag className="size-4" />
											)}{" "}
											ثبت هدف سمت
										</Button>
									</div>
								</CardContent>
							</Card>

							<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{overview?.teams.map((team) => {
									const average = team.assigned_subjects.length
										? team.assigned_subjects.reduce(
												(sum, subject) => sum + subject.progress_percent,
												0,
											) / team.assigned_subjects.length
										: 0;
									const stalled = team.assigned_subjects.some(
										(subject) => subject.status === "stalled",
									);
									return (
										<button
											type="button"
											key={team.team_id}
											onClick={() => void selectTeam(team.team_id)}
											className={`rounded-2xl border p-4 text-right transition ${selectedTeam?.team_id === team.team_id ? "border-amber-400/40 bg-amber-500/10" : "border-white/8 bg-slate-950/55 hover:bg-white/[0.05]"}`}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2 font-black">
													<Users className="size-4 text-cyan-300" /> تیم{" "}
													{team.team_id}
												</div>
												{stalled && (
													<Badge className="bg-orange-500/15 text-orange-200">
														متوقف
													</Badge>
												)}
											</div>
											<div className="mt-4 flex justify-between text-xs text-slate-500">
												<span>{team.assigned_subjects.length} موضوع</span>
												<strong className="text-slate-200">
													{Math.round(average)}٪
												</strong>
											</div>
											<Progress value={average} className="mt-2" />
											{team.credits !== undefined && (
												<div className="mt-3 flex items-center gap-1 text-xs text-amber-200">
													<Coins className="size-3" /> {team.credits} اعتبار
												</div>
											)}
										</button>
									);
								})}
							</section>

							{selectedTeam && (
								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center justify-between text-base">
											<span className="flex items-center gap-2">
												<CircleGauge className="size-5 text-cyan-300" /> پیشرفت
												تیم {selectedTeam.team_id}
											</span>
											<Badge variant="secondary">
												{selectedTeam.assigned_subjects.length} موضوع
											</Badge>
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-3 md:grid-cols-2">
										{selectedTeam.assigned_subjects.length === 0 ? (
											<div className="col-span-full rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
												موضوعی به این تیم تخصیص داده نشده است.
											</div>
										) : (
											selectedTeam.assigned_subjects.map((subject) => (
												<div
													key={subject.id}
													className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="font-bold">
															{getLocalized(subject.title, subject.title_fa)}
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
																? "متوقف"
																: subject.status === "completed"
																	? "تکمیل"
																	: "فعال"}
														</Badge>
													</div>
													<div className="mt-3 flex justify-between text-xs text-slate-500">
														<span>پیشرفت</span>
														<strong className="text-slate-200">
															{subject.progress_percent}٪
														</strong>
													</div>
													<Progress
														value={subject.progress_percent}
														className="mt-2"
													/>
													{subject.sub_subjects && (
														<div className="mt-3 flex flex-wrap gap-1.5">
															{subject.sub_subjects.map((sub) => (
																<Badge key={sub.id} variant="secondary">
																	{sub.progress_share}٪ {sub.completed && "✓"}
																</Badge>
															))}
														</div>
													)}
												</div>
											))
										)}
									</CardContent>
								</Card>
							)}

							<Card className="border-white/10 bg-slate-950/60 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Megaphone className="size-5 text-amber-300" /> صدور دستور
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid gap-3 md:grid-cols-2">
										<div>
											<div className="mb-2 text-xs text-slate-500">
												نوع دستور
											</div>
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
										</div>
										<div>
											<div className="mb-2 text-xs text-slate-500">تیم هدف</div>
											<Select
												value={String(targetTeamId)}
												onValueChange={(value) =>
													setTargetTeamId(Number(value))
												}
											>
												<SelectTrigger className="border-white/10 bg-white/5">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{overview?.teams.map((team) => (
														<SelectItem
															key={team.team_id}
															value={String(team.team_id)}
														>
															تیم {team.team_id}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
									{(orderType === "ASSIGN_SUBJECT" ||
										orderType === "FORCE_SUBJECT") && (
										<div>
											<div className="mb-2 text-xs text-slate-500">
												شناسه موضوع
											</div>
											<Input
												dir="ltr"
												value={subjectId}
												onChange={(event) => setSubjectId(event.target.value)}
												className="border-white/10 bg-white/5"
												placeholder="SUBJ_…"
											/>
										</div>
									)}
									{(orderType === "BAN_ACTION" ||
										orderType === "UNBAN_ACTION") && (
										<div>
											<div className="mb-2 text-xs text-slate-500">کد کنش</div>
											<Input
												dir="ltr"
												value={actionCode}
												onChange={(event) => setActionCode(event.target.value)}
												className="border-white/10 bg-white/5"
												placeholder="ACTION_CODE"
											/>
										</div>
									)}
									{orderType === "ALLOCATE_CREDIT" && (
										<div>
											<div className="mb-2 text-xs text-slate-500">
												مقدار اعتبار (منفی برای کسر)
											</div>
											<Input
												type="number"
												value={amount}
												onChange={(event) =>
													setAmount(Number(event.target.value))
												}
												className="border-white/10 bg-white/5"
											/>
										</div>
									)}
									{(orderType === "BAN_ACTION" ||
										orderType === "DISABLE_TEAM") && (
										<div className="grid gap-3 md:grid-cols-2">
											<div>
												<div className="mb-2 text-xs text-slate-500">
													مدت (نوبت)
												</div>
												<Input
													type="number"
													min={1}
													value={duration}
													onChange={(event) =>
														setDuration(Number(event.target.value))
													}
													className="border-white/10 bg-white/5"
												/>
											</div>
											{orderType === "DISABLE_TEAM" && (
												<div>
													<div className="mb-2 text-xs text-slate-500">
														دلیل
													</div>
													<Input
														value={reason}
														onChange={(event) => setReason(event.target.value)}
														className="border-white/10 bg-white/5"
													/>
												</div>
											)}
										</div>
									)}
									<Button
										onClick={() => void submitOrder()}
										disabled={busy !== null || !targetTeamId}
										className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
									>
										{busy === "order" ? (
											<LoaderCircle className="size-4 animate-spin" />
										) : (
											<Command className="size-4" />
										)}{" "}
										صدور دستور
									</Button>
								</CardContent>
							</Card>

							<div className="grid gap-5 lg:grid-cols-2">
								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<LockKeyhole className="size-5 text-orange-300" /> بررسی
											دلایل قفل
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<Select
											value={String(targetTeamId)}
											onValueChange={(value) => setTargetTeamId(Number(value))}
										>
											<SelectTrigger className="border-white/10 bg-white/5">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{overview?.teams.map((team) => (
													<SelectItem
														key={team.team_id}
														value={String(team.team_id)}
													>
														تیم {team.team_id}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Input
											dir="ltr"
											value={lockNodeId}
											onChange={(event) => setLockNodeId(event.target.value)}
											placeholder="شناسه گام یا گره"
											className="border-white/10 bg-white/5"
										/>
										<Button
											onClick={() => void inspectLock()}
											disabled={busy !== null || !lockNodeId.trim()}
											variant="outline"
											className="w-full border-orange-400/20 bg-orange-500/5"
										>
											{busy === "lock" ? (
												<LoaderCircle className="size-4 animate-spin" />
											) : (
												<LockKeyhole className="size-4" />
											)}{" "}
											مشاهده همه دلیل‌ها
										</Button>
									</CardContent>
								</Card>
								<Card className="border-white/10 bg-slate-950/60 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-base">
											<GitBranch className="size-5 text-cyan-300" /> نقشه
											فرماندهی
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="rounded-2xl border border-dashed border-cyan-400/15 bg-cyan-500/5 p-6 text-center">
											<ShieldCheck className="mx-auto size-9 text-cyan-300" />
											<p className="mt-3 text-sm leading-7 text-slate-400">
												endpoint گراف نقش‌محور دولت در قرارداد فعلی تعریف نشده
												است. این بخش فقط داده‌های مجاز overview را نمایش می‌دهد و
												اطلاعات دشمن را حدس نمی‌زند.
											</p>
										</div>
									</CardContent>
								</Card>
							</div>

							<Card className="border-white/10 bg-slate-950/60 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<ScrollText className="size-5 text-violet-300" /> تاریخچه
										دستورها
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{orders.length === 0 ? (
										<div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
											دستوری ثبت نشده است.
										</div>
									) : (
										orders.map((order, index) => (
											<div
												key={`${order.turn}-${order.target_team_id}-${index}`}
												className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
											>
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
										))
									)}
								</CardContent>
							</Card>
						</div>
						<aside className="space-y-5">
							<GameEventFeed events={events.events} status={events.status} />
							<CommunicationPanel
								service={communicationService}
								gameId={gameId ?? "active-game"}
								senderRole="GOVERNMENT"
								relatedScenarioId={null}
							/>
						</aside>
					</section>
				)}
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
							<LockKeyhole className="size-5 text-orange-300" /> دلایل قفل برای
							تیم {targetTeamId}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						{lockReasons?.length === 0 && (
							<div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-4 text-sm text-emerald-100">
								<CheckCircle2 className="ml-2 inline size-4" />
								مانع فعالی ثبت نشده است.
							</div>
						)}
						{lockReasons?.map((item, index) => (
							<div
								key={`${item.code}-${index}`}
								className="rounded-xl border border-orange-400/15 bg-orange-500/5 p-4"
							>
								<div className="font-mono text-xs text-orange-300">
									{item.code}
								</div>
								<p className="mt-2 text-sm leading-7">
									{formatLockReasonFa(item.code, item.message)}
								</p>
								{item.source && (
									<div className="mt-2 text-[10px] text-slate-500">
										منبع: {item.source}
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
