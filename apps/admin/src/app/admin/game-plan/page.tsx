"use client";

import type {
	AdminUserSummary,
	ConfigureAllRequestV2,
	GamePlanValidationError,
} from "@workspace/trpc";
import {
	getLocalized,
	normalizeDefaultGamePlan,
	parseApiError,
	validateDefaultGamePlanClientSide,
	validateTeamMemberAssignments,
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	CloudUpload,
	Database,
	FileCheck2,
	Layers3,
	LoaderCircle,
	Lock,
	Play,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Users,
	WandSparkles,
} from "lucide-react";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminAuth } from "@/components/AdminAuthGate";
import AiAssistantLevels from "@/components/AiAssistantLevels";
import { Arsenal, type ArsenalFocus } from "@/components/builder/Arsenal";
import { CampaignMap, type PlanFocus } from "@/components/builder/CampaignMap";
import { ConfirmRemove } from "@/components/builder/ConfirmRemove";
import { JsonToggle } from "@/components/builder/JsonToggle";
import { PlanHealth } from "@/components/builder/PlanHealth";
import {
	buildSummaryLookups,
	describeEntity,
	EntitySummaryCard,
	EntitySummaryHeader,
} from "@/components/CollectionSummary";
import TeamMemberAssignment from "@/components/TeamMemberAssignment";
import {
	listAdminUsers,
	loadAiAssistantConfig,
	loadDefaultGamePlan,
	loadDemoGamePlan,
	loadPublishedGamePlan,
	startAdminGame,
	storeActiveGameId,
	storeGamePlanDraft,
	submitDefaultGamePlan,
	validateGamePlanOnServer,
} from "@/lib/game-plan";

type TabKey =
	| "overview"
	| "members"
	| "campaign"
	| "arsenal"
	| "advanced"
	| "publish"
	| "ai";

type CollectionKey = "impact_rules";

type SourceMode = "none" | "default" | "demo" | "published" | "custom";

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
	{ key: "overview", label: "نمای کلی" },
	{ key: "members", label: "اعضای تیم‌ها" },
	{ key: "arsenal", label: "کنش‌ها" },
	{ key: "campaign", label: "اهداف و سناریوها" },
	{ key: "advanced", label: "تنظیمات پیشرفته" },
	{ key: "publish", label: "بررسی و انتشار" },
	{ key: "ai", label: "دستیار هوشمند" },
];

const COLLECTION_LABEL: Record<CollectionKey, string> = {
	impact_rules: "قانون اثرگذاری",
};

const INITIAL_ITEM: Record<CollectionKey, Record<string, unknown>> = {
	impact_rules: {
		id: "IMPACT_NEW",
		trigger: { event: "SCENARIO_STEP_RESOLVED" },
		effects: [],
	},
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const entityKey = (item: Record<string, unknown>, index: number): string => {
	const candidate = item.id ?? item.code;
	return typeof candidate === "string" ? candidate : String(index);
};

const entityTitle = (item: Record<string, unknown>, index: number): string => {
	const fa = item.title_fa ?? item.name_fa ?? item.display_name_fa;
	const fallback =
		item.title ?? item.name ?? item.display_name ?? item.id ?? item.code;
	return getLocalized(
		typeof fallback === "string" ? fallback : `مورد ${index + 1}`,
		typeof fa === "string" ? fa : undefined,
	);
};

const sourceLabel: Record<SourceMode, string> = {
	none: "انتخاب نشده",
	default: "سناریوی پیش‌فرض",
	demo: "سناریوی دمو",
	published: "نسخه منتشرشده",
	custom: "پیش‌نویس ویرایش‌شده",
};

const groupLabel: Record<string, string> = {
	members: "اعضای تیم‌ها",
	goals: "اهداف",
	subjects: "موضوع‌ها",
	sub_subjects: "زیرموضوع‌ها",
	scenarios: "سناریوها",
	steps: "گام‌ها",
	actions: "کنش‌ها",
	effects: "اثرها",
	visibility: "نمایش رویدادها",
	general: "عمومی",
};

function CollectionEditor({
	collectionKey,
	items,
	plan,
	onChange,
}: {
	collectionKey: CollectionKey;
	items: unknown[];
	// Cards resolve references - an action code into its Persian name - so the
	// editor needs the whole plan.
	plan: unknown;
	onChange: (items: Record<string, unknown>[]) => void;
}) {
	const records = useMemo<Record<string, unknown>[]>(
		() =>
			items.reduce<Record<string, unknown>[]>((result, item) => {
				const record = toRecord(item);
				if (record) result.push(record);
				return result;
			}, []),
		[items],
	);
	const lookups = useMemo(() => buildSummaryLookups(plan), [plan]);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const filtered = records
		.map((item, index) => ({ item, index }))
		.filter(({ item, index }) =>
			`${entityTitle(item, index)} ${entityKey(item, index)}`
				.toLowerCase()
				.includes(query.toLowerCase()),
		);
	const selected = records[selectedIndex] ?? null;

	const add = () => {
		const next = [...records, structuredClone(INITIAL_ITEM[collectionKey])];
		onChange(next);
		setSelectedIndex(next.length - 1);
	};

	const remove = () => {
		if (!selected) return;
		onChange(records.filter((_, index) => index !== selectedIndex));
		setSelectedIndex(Math.max(0, selectedIndex - 1));
	};

	return (
		<div className="grid min-h-[480px] min-w-0 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
			<Card className="min-w-0 overflow-hidden border-white/10 bg-slate-950/55 text-slate-100">
				<CardHeader className="space-y-4">
					<div className="flex items-center justify-between">
						<CardTitle>{COLLECTION_LABEL[collectionKey]}ها</CardTitle>
						<Badge variant="secondary">
							{records.length.toLocaleString("fa-IR")}
						</Badge>
					</div>
					<div className="relative">
						<Search className="absolute right-3 top-2.5 size-4 text-slate-500" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="جست‌وجو…"
							className="border-white/10 bg-white/5 pr-9"
						/>
					</div>
					<Button
						onClick={add}
						className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
					>
						افزودن {COLLECTION_LABEL[collectionKey]}
					</Button>
				</CardHeader>
				<CardContent className="min-w-0">
					<ScrollArea dir="rtl" className="h-[430px] pl-2">
						<div className="min-w-0 space-y-2">
							{filtered.map(({ item, index }) => (
								<button
									key={`${entityKey(item, index)}-${index}`}
									type="button"
									onClick={() => setSelectedIndex(index)}
									className={`block w-full overflow-hidden min-w-0 rounded-xl border p-3 text-right transition ${selectedIndex === index ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}
								>
									<EntitySummaryCard
										summary={describeEntity(
											collectionKey,
											item,
											index,
											lookups,
										)}
									/>
								</button>
							))}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
			<Card className="min-w-0 overflow-hidden border-white/10 bg-slate-950/55 text-slate-100">
				<CardContent className="space-y-4 p-5">
					{selected ? (
						<>
							<EntitySummaryHeader
								summary={describeEntity(
									collectionKey,
									selected,
									selectedIndex,
									lookups,
								)}
							/>
							<div className="flex flex-wrap items-start gap-2">
								<ConfirmRemove
									title={`حذف ${COLLECTION_LABEL[collectionKey]} «${entityTitle(selected, selectedIndex)}»`}
									consequences={[]}
									onConfirm={remove}
								/>
								<div className="min-w-0 flex-1">
									<JsonToggle
										value={selected}
										onApply={(parsed) => {
											const next = [...records];
											next[selectedIndex] = parsed;
											onChange(next);
										}}
										validate={(parsed) =>
											toRecord(parsed) ? null : "مقدار باید یک شیء JSON باشد."
										}
									/>
								</div>
							</div>
						</>
					) : (
						<div className="grid min-h-60 place-items-center text-slate-500">
							موردی انتخاب نشده است.
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function AdminGamePlanPage() {
	const { logout } = useAdminAuth();
	const importInputRef = useRef<HTMLInputElement | null>(null);
	const [activeTab, setActiveTab] = useState<TabKey>("overview");
	const [plan, setPlan] = useState<ConfigureAllRequestV2 | null>(null);
	const [source, setSource] = useState<SourceMode>("none");
	const [busy, setBusy] = useState<"load" | "validate" | "publish" | null>(
		null,
	);
	const [notice, setNotice] = useState<{
		tone: "success" | "error" | "info";
		text: string;
	} | null>(null);
	const [validationErrors, setValidationErrors] = useState<
		Array<GamePlanValidationError & { group?: string }>
	>([]);
	const [serverValidated, setServerValidated] = useState(false);
	const [configuredGameId, setConfiguredGameId] = useState<string | null>(null);
	const [aiConfigReminder, setAiConfigReminder] = useState<string | null>(null);
	const [startingGame, setStartingGame] = useState(false);
	const [users, setUsers] = useState<AdminUserSummary[]>([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [usersLoaded, setUsersLoaded] = useState(false);
	const [usersError, setUsersError] = useState<string | null>(null);

	const refreshUsers = useCallback(async () => {
		setUsersLoading(true);
		setUsersError(null);
		try {
			const nextUsers = await listAdminUsers();
			setUsers(nextUsers);
			setUsersLoaded(true);
		} catch (error) {
			const parsed = parseApiError(error, "دریافت فهرست کاربران ممکن نشد.");
			setUsersError(parsed.message);
			setUsersLoaded(false);
			if (parsed.status === 401 || parsed.status === 403) logout();
		} finally {
			setUsersLoading(false);
		}
	}, [logout]);

	useEffect(() => {
		void refreshUsers();
	}, [refreshUsers]);

	useEffect(() => {
		if (plan) storeGamePlanDraft(plan);
	}, [plan]);

	const summary = useMemo(
		() => ({
			goals: plan?.goals.length ?? 0,
			subjects: plan?.subjects.length ?? 0,
			subSubjects: plan?.sub_subjects.length ?? 0,
			scenarios: plan?.scenarios.length ?? 0,
			steps: plan?.scenario_steps.length ?? 0,
			actions: plan?.actions.length ?? 0,
			market: plan?.black_market?.length ?? 0,
			visibility: plan ? Object.keys(plan.visibility_config.events).length : 0,
			members:
				plan?.teams.reduce((count, team) => count + team.players.length, 0) ??
				0,
		}),
		[plan],
	);

	const validateLocally = useCallback(
		(nextPlan: ConfigureAllRequestV2) => {
			const contract = validateDefaultGamePlanClientSide(nextPlan);
			const memberErrors = usersLoaded
				? validateTeamMemberAssignments(
						nextPlan,
						users.map((user) => user.id),
					)
				: [
						{
							group: "members" as const,
							loc: "admin.users",
							code: "USER_LIST_NOT_LOADED",
							message:
								"فهرست کاربران سرور بارگذاری نشده است؛ پیش از انتشار آن را به‌روزرسانی کنید.",
						},
					];
			const errors = [...contract.errors, ...memberErrors];
			return { valid: errors.length === 0, errors };
		},
		[users, usersLoaded],
	);

	// Re-run on every edit. The builder used to clear its errors on each change
	// and only show them again after "validate"; now they are always current.
	const liveIssues = useMemo(
		() => (plan ? validateLocally(plan).errors : []),
		[plan, validateLocally],
	);

	const [campaignFocus, setCampaignFocus] = useState<PlanFocus | null>(null);
	const [arsenalFocus, setArsenalFocus] = useState<ArsenalFocus | null>(null);

	/** Jumps from an issue to the thing it is about, when that is a plan node. */
	const focusIssue = (loc: string) => {
		if (!plan) return;
		const nonce = Date.now();
		const nodes: Array<[PlanFocus["kind"], Array<{ id: string }>]> = [
			["goal", plan.goals],
			["subject", plan.subjects],
			["sub_subject", plan.sub_subjects],
			["scenario", plan.scenarios],
			["step", plan.scenario_steps],
		];
		for (const [kind, items] of nodes) {
			if (items.some((item) => item.id === loc)) {
				setCampaignFocus({ kind, id: loc, nonce });
				setActiveTab("campaign");
				return;
			}
		}
		if (plan.actions.some((action) => action.code === loc)) {
			setArsenalFocus({ code: loc, nonce });
			setActiveTab("arsenal");
		}
	};

	const setEditablePlan = (next: ConfigureAllRequestV2) => {
		setPlan(structuredClone(next));
		setSource((current) =>
			current === "none"
				? "custom"
				: current === "default"
					? "default"
					: "custom",
		);
		setServerValidated(false);
		setValidationErrors([]);
	};

	const loadDefault = async () => {
		setBusy("load");
		setNotice(null);
		try {
			const next = await loadDefaultGamePlan();
			setPlan(next);
			setSource("default");
			const client = validateLocally(next);
			setValidationErrors([]);
			setNotice({
				tone: client.valid ? "success" : "error",
				text: client.valid
					? "سناریوی پیش‌فرض بارگذاری شد و بررسی اولیه مشکلی پیدا نکرد."
					: `${client.errors.length} مشکل در سناریوی پیش‌فرض پیدا شد.`,
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "بارگذاری سناریوی پیش‌فرض ممکن نشد.").message,
			});
		} finally {
			setBusy(null);
		}
	};

	const loadDemo = async () => {
		setBusy("load");
		setNotice(null);
		try {
			const next = await loadDemoGamePlan();
			setPlan(next);
			setSource("demo");
			const client = validateLocally(next);
			setValidationErrors([]);
			setNotice({
				tone: client.valid ? "success" : "error",
				text: client.valid
					? "سناریوی دمو بارگذاری شد و بررسی اولیه مشکلی پیدا نکرد."
					: `${client.errors.length} مشکل در سناریوی دمو پیدا شد.`,
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "بارگذاری سناریوی دمو ممکن نشد.").message,
			});
		} finally {
			setBusy(null);
		}
	};

	const importGamePlanJson = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setBusy("load");
		setNotice(null);
		try {
			const next = normalizeDefaultGamePlan(JSON.parse(await file.text()));
			setPlan(next);
			setSource("custom");
			const client = validateLocally(next);
			setValidationErrors([]);
			setServerValidated(false);
			setNotice({
				tone: client.valid ? "success" : "error",
				text: client.valid
					? `فایل ${file.name} بارگذاری شد و بررسی اولیه مشکلی پیدا نکرد.`
					: `${client.errors.length} مشکل در فایل ${file.name} پیدا شد.`,
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(
					error,
					"فایل JSON معتبر نیست یا با قرارداد برنامه بازی سازگار نیست.",
				).message,
			});
		} finally {
			setBusy(null);
		}
	};

	const loadPublished = async () => {
		setBusy("load");
		setNotice(null);
		try {
			const next = await loadPublishedGamePlan();
			setPlan(next);
			setSource("published");
			setNotice({
				tone: "success",
				text: "آخرین برنامه منتشرشده از سرور دریافت شد.",
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "دریافت برنامه منتشرشده ممکن نشد.").message,
			});
		} finally {
			setBusy(null);
		}
	};

	const validate = async (): Promise<boolean> => {
		if (!plan) return false;
		setBusy("validate");
		setNotice(null);
		const client = validateLocally(plan);
		if (!client.valid) {
			setValidationErrors([]);
			setServerValidated(false);
			setNotice({
				tone: "error",
				text: `${client.errors.length} مشکل پیش از ارسال به سرور پیدا شد.`,
			});
			setBusy(null);
			return false;
		}
		try {
			const response = await validateGamePlanOnServer(plan);
			setValidationErrors(response.errors);
			setServerValidated(response.valid);
			setNotice({
				tone: response.valid ? "success" : "error",
				text: response.valid
					? "بررسی سرور موفق بود؛ برنامه آمادهٔ انتشار است."
					: `${response.errors.length} مشکلی که سرور پیدا کرده باید برطرف شود.`,
			});
			return response.valid;
		} catch (error) {
			setServerValidated(false);
			setNotice({
				tone: "error",
				text: parseApiError(error, "بررسی سرور ناموفق بود.").message,
			});
			return false;
		} finally {
			setBusy(null);
		}
	};

	const publish = async () => {
		if (!plan) return;
		const valid = serverValidated || (await validate());
		if (!valid) return;
		setBusy("publish");
		try {
			const response = await submitDefaultGamePlan(plan);
			storeActiveGameId(response.gameId);
			setConfiguredGameId(response.gameId);
			setSource("published");
			setNotice({
				tone: "success",
				text: `بازی با شناسه ${response.gameId} منتشر شد.`,
			});
			try {
				await loadAiAssistantConfig();
				setAiConfigReminder(null);
			} catch (error) {
				const parsed = parseApiError(
					error,
					"دریافت تنظیمات دستیار هوشمند ممکن نشد.",
				);
				if (parsed.status === 404 || parsed.code === "AI_CONFIG_NOT_SET") {
					setAiConfigReminder(
						"برنامه منتشر شد، اما تنظیمات دستیار هوشمند هنوز ثبت نشده است. پیش از شروع بازی، سطح‌ها و هزینه‌های دستیار را تنظیم کنید.",
					);
				} else {
					setAiConfigReminder(parsed.message);
				}
			}
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "انتشار برنامه ناموفق بود.").message,
			});
		} finally {
			setBusy(null);
		}
	};

	const startPublishedGame = async (): Promise<void> => {
		if (!configuredGameId) return;
		setStartingGame(true);
		try {
			const response = await startAdminGame(configuredGameId);
			setNotice({
				tone: "success",
				text: response.detail || `بازی ${configuredGameId} شروع شد.`,
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "شروع بازی ممکن نشد.").message,
			});
		} finally {
			setStartingGame(false);
		}
	};

	const updateCollection = (
		key: CollectionKey,
		items: Record<string, unknown>[],
	) => {
		if (!plan) return;
		setEditablePlan({
			...plan,
			[key]: items,
		} as unknown as ConfigureAllRequestV2);
	};

	const errorsByGroup = useMemo(
		() =>
			[...liveIssues, ...validationErrors].reduce<
				Record<string, GamePlanValidationError[]>
			>((groups, error) => {
				const group =
					"group" in error && typeof error.group === "string"
						? error.group
						: error.loc.split("[")[0] || "general";
				groups[group] = [...(groups[group] ?? []), error];
				return groups;
			}, {}),
		[liveIssues, validationErrors],
	);

	return (
		<main className="min-h-screen bg-[#070b17] text-slate-100">
			<div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
				<header className="mb-5 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="text-2xl font-black">تنظیم بازی</h1>
						<p className="mt-1 text-sm text-slate-400">
							هدف ← موضوع ← زیرموضوع ← سناریو ← گام ← کنش
						</p>
					</div>
					<Badge className="border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
						منبع: {sourceLabel[source]}
					</Badge>
				</header>

				{notice && (
					<div
						className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${notice.tone === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : notice.tone === "error" ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"}`}
					>
						{notice.tone === "success" ? (
							<CheckCircle2 className="mt-0.5 size-5 shrink-0" />
						) : (
							<AlertTriangle className="mt-0.5 size-5 shrink-0" />
						)}
						<span>{notice.text}</span>
					</div>
				)}

				{aiConfigReminder && (
					<div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-1 size-5 shrink-0" />
							<span>{aiConfigReminder}</span>
						</div>
						<Button
							onClick={() => setActiveTab("ai")}
							className="bg-amber-300 font-bold text-slate-950 hover:bg-amber-200"
						>
							تنظیم دستیار هوشمند
						</Button>
					</div>
				)}

				{configuredGameId && (
					<div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
						<Badge className="bg-emerald-500/15 text-emerald-100">
							بازی {configuredGameId}
						</Badge>
						<Button
							onClick={() => void startPublishedGame()}
							disabled={startingGame}
							className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
						>
							{startingGame ? (
								<LoaderCircle className="size-4 animate-spin" />
							) : (
								<Play className="size-4" />
							)}{" "}
							شروع بازی
						</Button>
						<Button asChild variant="outline">
							<Link href="/monitoring">پایش بازی</Link>
						</Button>
					</div>
				)}

				{plan && activeTab !== "overview" && activeTab !== "publish" && (
					<PlanHealth
						issues={liveIssues}
						serverValidated={serverValidated}
						onOpen={() => setActiveTab("publish")}
					/>
				)}

				<div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
					<aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/55 p-3 backdrop-blur-xl xl:sticky xl:top-5">
						<div className="px-3 pb-3 pt-2 text-xs font-bold text-slate-500">
							بخش‌ها
						</div>
						<nav className="space-y-1">
							{TAB_ITEMS.map((tab, index) => {
								// The AI ladder is stored per published game, so it cannot be
								// edited before configure_all has produced a gameId.
								const locked = tab.key === "ai" && !configuredGameId;
								return (
									<button
										type="button"
										key={tab.key}
										disabled={locked}
										title={
											locked
												? "ابتدا برنامه را منتشر کنید تا شناسه بازی ساخته شود."
												: undefined
										}
										onClick={() => setActiveTab(tab.key)}
										className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
											locked
												? "cursor-not-allowed text-slate-600"
												: activeTab === tab.key
													? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
													: "text-slate-400 hover:bg-white/5 hover:text-slate-100"
										}`}
									>
										<span>
											{index + 1}. {tab.label}
										</span>
										{locked ? (
											<Lock className="size-3.5 opacity-60" />
										) : (
											<ChevronLeft className="size-4 opacity-60" />
										)}
									</button>
								);
							})}
						</nav>
					</aside>

					<section className="min-w-0">
						{activeTab === "overview" && (
							<div className="space-y-5">
								{plan && (
									<p className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm tabular-nums text-slate-300">
										{[
											[summary.goals, "هدف"],
											[summary.subjects, "موضوع"],
											[summary.subSubjects, "زیرموضوع"],
											[summary.scenarios, "سناریو"],
											[summary.steps, "گام"],
											[summary.actions, "کنش"],
											[summary.market, "آیتم بازار سیاه"],
											[summary.members, "عضو"],
										]
											.map(
												([count, label]) =>
													`${count.toLocaleString("fa-IR")} ${label}`,
											)
											.join(" · ")}
									</p>
								)}
								<Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-l from-cyan-500/10 via-slate-950/80 to-violet-500/10 text-slate-100">
									<CardContent className="flex flex-col items-start justify-between gap-6 p-7 lg:flex-row lg:items-center">
										<div className="max-w-2xl">
											<h2 className="text-2xl font-black">
												یک نقطهٔ شروع انتخاب کنید
											</h2>
											<p className="mt-3 leading-8 text-slate-400">
												یک نسخهٔ قابل ویرایش ساخته می‌شود. تا وقتی «انتشار» را
												نزنید، چیزی روی سرور عوض نمی‌شود.
											</p>
										</div>
										<div className="flex flex-wrap gap-3">
											<Button
												onClick={loadDemo}
												disabled={busy !== null}
												className="h-12 bg-emerald-400 px-5 text-slate-950 hover:bg-emerald-300"
											>
												{busy === "load" ? (
													<LoaderCircle className="size-4 animate-spin" />
												) : (
													<Sparkles className="size-4" />
												)}{" "}
												سناریوی دمو
											</Button>
											<Button
												onClick={loadDefault}
												disabled={busy !== null}
												className="h-12 bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300"
											>
												{busy === "load" ? (
													<LoaderCircle className="size-4 animate-spin" />
												) : (
													<WandSparkles className="size-4" />
												)}{" "}
												سناریوی پیش‌فرض
											</Button>
											<input
												ref={importInputRef}
												type="file"
												accept="application/json,.json"
												className="hidden"
												onChange={importGamePlanJson}
											/>
											<Button
												onClick={() => importInputRef.current?.click()}
												disabled={busy !== null}
												variant="outline"
												className="h-12 border-white/10 bg-white/5 text-slate-100"
											>
												<CloudUpload className="size-4" /> بارگذاری فایل JSON
											</Button>
											<Button
												onClick={loadPublished}
												disabled={busy !== null}
												variant="outline"
												className="h-12 border-white/10 bg-white/5 text-slate-100"
											>
												<RefreshCw className="size-4" /> دریافت نسخه منتشرشده
											</Button>
										</div>
									</CardContent>
								</Card>
								<div className="grid gap-4 lg:grid-cols-2">
									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<Database className="size-5 text-cyan-300" /> نقطهٔ شروع
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="text-2xl font-black">
												{sourceLabel[source]}
											</div>
										</CardContent>
									</Card>
									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<ShieldCheck className="size-5 text-violet-300" /> وضعیت
												بررسی
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div
												className={`text-xl font-black ${serverValidated ? "text-emerald-300" : "text-amber-300"}`}
											>
												{serverValidated
													? "تأییدشده توسط سرور"
													: liveIssues.length > 0
														? `${liveIssues.length.toLocaleString("fa-IR")} مشکل باز`
														: "در انتظار بررسی"}
											</div>
											<Button
												className="mt-4 w-full"
												variant="outline"
												disabled={!plan || busy !== null}
												onClick={() => {
													setActiveTab("publish");
													void validate();
												}}
											>
												بررسی برنامه
											</Button>
										</CardContent>
									</Card>
								</div>
							</div>
						)}

						{activeTab === "members" && plan && (
							<TeamMemberAssignment
								plan={plan}
								users={users}
								loading={usersLoading}
								error={usersError}
								onReload={() => void refreshUsers()}
								onChange={setEditablePlan}
							/>
						)}

						{activeTab === "ai" && (
							<AiAssistantLevels embedded expectedGameId={configuredGameId} />
						)}

						{activeTab === "campaign" && plan && (
							<CampaignMap
								plan={plan}
								issues={liveIssues}
								onChange={setEditablePlan}
								focus={campaignFocus}
							/>
						)}

						{activeTab === "arsenal" && plan && (
							<Arsenal
								plan={plan}
								onChange={setEditablePlan}
								focus={arsenalFocus}
							/>
						)}

						{activeTab === "advanced" && plan && (
							<div className="space-y-5">
								<p className="text-sm leading-7 text-slate-400">
									این بخش‌ها کمتر عوض می‌شوند. دولت‌ها و نمایش رویدادها فقط
									خواندنی‌اند و از فایل برنامه می‌آیند.
								</p>
								<Card className="border-white/10 bg-slate-950/55 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Users className="text-amber-300" /> دولت‌ها و سمت‌ها
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 lg:grid-cols-2">
										{plan?.government?.side_governments.map((government) => {
											const team = plan.teams.find(
												(item) => item.id === government.team_id,
											);
											return (
												<div
													key={government.team_id}
													className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-5"
												>
													<div className="flex items-center justify-between">
														<div className="text-lg font-black">
															{getLocalized(
																team?.display_name ?? team?.name,
																team?.display_name_fa ?? team?.name_fa,
															)}
														</div>
														<Badge className="bg-amber-400/15 text-amber-200">
															سمت {government.side_id}
														</Badge>
													</div>
													<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
														<div className="rounded-xl bg-white/5 p-3">
															<span className="text-slate-500">تیم دولت</span>
															<div className="mt-1 font-bold">
																{government.team_id}
															</div>
														</div>
														<div className="rounded-xl bg-white/5 p-3">
															<span className="text-slate-500">کاربر دولت</span>
															<div className="mt-1 font-bold">
																{government.player.name ??
																	government.player.userId}
															</div>
														</div>
													</div>
												</div>
											);
										}) ?? (
											<div className="text-slate-500">
												ابتدا برنامه بازی را بارگذاری کنید.
											</div>
										)}
									</CardContent>
								</Card>
								<Card className="border-white/10 bg-slate-950/55 text-slate-100">
									<CardHeader>
										<CardTitle>نمایش رویدادها</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="mb-4 text-sm text-slate-400">
											{summary.visibility.toLocaleString("fa-IR")} از ۶۶ رویداد
											تنظیم شده · نمایش به سمت مقابل برای{" "}
											{(
												plan?.visibility_config.cross_side_result.grantees
													.length ?? 0
											).toLocaleString("fa-IR")}{" "}
											مخاطب
										</p>
										<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
											<div className="flex items-center justify-between">
												<div>
													<div className="font-bold">پوشش کامل رویدادها</div>
													<p className="mt-1 text-sm text-slate-500">
														هر ۶۶ نوع رویداد باید مخاطب مشخص داشته باشد.
													</p>
												</div>
												{summary.visibility >= 66 ? (
													<Badge className="bg-emerald-500/15 text-emerald-200">
														کامل
													</Badge>
												) : (
													<Badge className="bg-rose-500/15 text-rose-200">
														ناقص
													</Badge>
												)}
											</div>
											<Progress
												className="mt-4"
												value={Math.min(100, (summary.visibility / 66) * 100)}
											/>
										</div>
									</CardContent>
								</Card>
								<div>
									<h2 className="mb-3 font-black text-slate-200">
										قوانین اثرگذاری
									</h2>
									<CollectionEditor
										collectionKey="impact_rules"
										plan={plan}
										items={plan.impact_rules as unknown[]}
										onChange={(items) =>
											updateCollection("impact_rules", items)
										}
									/>
								</div>
							</div>
						)}

						{activeTab === "publish" && (
							<div className="space-y-5">
								<Card className="border-white/10 bg-slate-950/55 text-slate-100">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<CloudUpload className="text-cyan-300" /> بررسی و انتشار
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-5 lg:grid-cols-[1fr_auto]">
										<div>
											<p className="leading-8 text-slate-400">
												اول مرورگر ارجاع‌ها، جمع سهم‌ها، ترتیب گام‌ها، هدف اثرها و
												نمایش رویدادها را بررسی می‌کند؛ بعد سرور برنامه را بدون
												اجرا امتحان می‌کند. انتشار فقط بعد از تأیید سرور فعال
												می‌شود.
											</p>
											<div className="mt-5 flex flex-wrap gap-3">
												<Button
													onClick={() => void validate()}
													disabled={!plan || busy !== null}
													variant="outline"
													className="border-cyan-400/30 bg-cyan-500/5 text-cyan-100"
												>
													{busy === "validate" ? (
														<LoaderCircle className="size-4 animate-spin" />
													) : (
														<FileCheck2 className="size-4" />
													)}{" "}
													بررسی برنامه
												</Button>
												<Button
													onClick={() => void publish()}
													disabled={!plan || busy !== null || !serverValidated}
													className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
												>
													{busy === "publish" ? (
														<LoaderCircle className="size-4 animate-spin" />
													) : (
														<CloudUpload className="size-4" />
													)}{" "}
													انتشار
												</Button>
											</div>
										</div>
										<div
											className={`grid min-w-48 place-items-center rounded-2xl border p-6 text-center ${serverValidated ? "border-emerald-400/20 bg-emerald-500/10" : "border-amber-400/20 bg-amber-500/10"}`}
										>
											{serverValidated ? (
												<CheckCircle2 className="size-9 text-emerald-300" />
											) : (
												<AlertTriangle className="size-9 text-amber-300" />
											)}
											<div className="mt-2 font-black">
												{serverValidated ? "آماده انتشار" : "در انتظار تأیید"}
											</div>
										</div>
									</CardContent>
								</Card>
								{Object.entries(errorsByGroup).map(([group, errors]) => (
									<Card
										key={group}
										className="border-rose-400/15 bg-rose-500/5 text-slate-100"
									>
										<CardHeader>
											<CardTitle className="flex items-center justify-between text-base">
												<span>{groupLabel[group] ?? group}</span>
												<Badge className="bg-rose-500/15 text-rose-200">
													{errors.length}
												</Badge>
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-2">
											{errors.map((error, index) => (
												<button
													type="button"
													key={`${error.loc}-${error.code}-${index}`}
													onClick={() => focusIssue(error.loc)}
													title="رفتن به همین مورد"
													className="block w-full rounded-xl border border-white/5 bg-slate-950/40 p-3 text-right transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
												>
													<p className="text-sm text-slate-200">
														{error.message}
													</p>
													<div
														dir="ltr"
														className="mt-1 flex flex-wrap justify-end gap-2 font-mono text-[10px] text-slate-600"
													>
														<span>{error.loc}</span>
														<span>{error.code}</span>
													</div>
												</button>
											))}
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{!plan && activeTab !== "overview" && (
							<div className="grid min-h-[520px] place-items-center rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
								<div>
									<Layers3 className="mx-auto size-12 text-slate-700" />
									<h2 className="mt-4 text-xl font-black">
										هنوز برنامه‌ای بارگذاری نشده است
									</h2>
									<p className="mt-2 text-slate-500">
										از نمای کلی، سناریوی پیش‌فرض یا نسخه منتشرشده را انتخاب کنید.
									</p>
									<Button
										onClick={() => setActiveTab("overview")}
										className="mt-5"
									>
										رفتن به نمای کلی
									</Button>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</main>
	);
}
