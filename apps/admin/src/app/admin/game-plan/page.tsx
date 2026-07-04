"use client";

import type {
	AdminUserSummary,
	ConfigureAllRequestV2,
	GamePlanValidationError,
} from "@workspace/trpc";
import {
	getLocalized,
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
import { Textarea } from "@workspace/ui/components/textarea";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	Boxes,
	CheckCircle2,
	ChevronLeft,
	CloudUpload,
	Database,
	FileCheck2,
	GitBranch,
	Layers3,
	LoaderCircle,
	LogOut,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	Users,
	WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/components/AdminAuthGate";
import TeamMemberAssignment from "@/components/TeamMemberAssignment";
import {
	listAdminUsers,
	loadDefaultGamePlan,
	loadPublishedGamePlan,
	storeGamePlanDraft,
	submitDefaultGamePlan,
	validateGamePlanOnServer,
} from "@/lib/game-plan";

type TabKey =
	| "overview"
	| "members"
	| "goals"
	| "subjects"
	| "sub_subjects"
	| "scenarios"
	| "scenario_steps"
	| "actions"
	| "black_market"
	| "government"
	| "impact_rules"
	| "visibility_config"
	| "graph"
	| "publish";

type CollectionKey =
	| "goals"
	| "subjects"
	| "sub_subjects"
	| "scenarios"
	| "scenario_steps"
	| "actions"
	| "black_market"
	| "impact_rules";

type SourceMode = "none" | "default" | "published" | "custom";

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
	{ key: "overview", label: "نمای کلی" },
	{ key: "members", label: "اعضای تیم‌ها" },
	{ key: "goals", label: "اهداف" },
	{ key: "subjects", label: "موضوع‌ها" },
	{ key: "sub_subjects", label: "زیرموضوع‌ها" },
	{ key: "scenarios", label: "سناریوها" },
	{ key: "scenario_steps", label: "گام‌ها" },
	{ key: "actions", label: "کنش‌ها" },
	{ key: "black_market", label: "بازار سیاه" },
	{ key: "government", label: "دولت‌ها" },
	{ key: "impact_rules", label: "قوانین اثرگذاری" },
	{ key: "visibility_config", label: "نمایش رویدادها" },
	{ key: "graph", label: "گراف بازی" },
	{ key: "publish", label: "اعتبارسنجی و انتشار" },
];

const COLLECTION_LABEL: Record<CollectionKey, string> = {
	goals: "هدف",
	subjects: "موضوع",
	sub_subjects: "زیرموضوع",
	scenarios: "سناریو",
	scenario_steps: "گام",
	actions: "کنش",
	black_market: "آیتم بازار سیاه",
	impact_rules: "قانون اثرگذاری",
};

const INITIAL_ITEM: Record<CollectionKey, Record<string, unknown>> = {
	goals: {
		id: "GOAL_NEW",
		title: "New goal",
		title_fa: "هدف جدید",
		description: "",
		description_fa: "",
		side_id: 0,
	},
	subjects: {
		id: "SUBJ_NEW",
		goal_id: "",
		title: "New subject",
		title_fa: "موضوع جدید",
		subject_type: "asset",
		target_team_id: 0,
		owner_side_id: 0,
		criticality: 3,
		mitre_mapping: {},
	},
	sub_subjects: {
		id: "SS_NEW",
		subject_id: "",
		title: "New sub-subject",
		title_fa: "زیرموضوع جدید",
		progress_share: 100,
		source: {},
		completion_rule: {},
	},
	scenarios: {
		id: "SCN_NEW",
		sub_subject_id: "",
		title: "New scenario",
		title_fa: "سناریوی جدید",
		scenario_type: "attack_path",
		execution_mode: "ordered",
		allowed_team_roles: ["ATTACKER"],
		base_reward_points: 1,
		base_credit_cost: 0,
		risk_level: "medium",
	},
	scenario_steps: {
		id: "STEP_NEW",
		scenario_id: "",
		order: 1,
		action_code: "",
		required: true,
		depends_on: [],
		on_success: [],
		on_failure: [],
	},
	actions: {
		code: "ACTION_NEW",
		name: "New action",
		name_fa: "کنش جدید",
		type: "attack",
		description: "",
		description_fa: "",
		base_stats: { cost: 0, success_probability: 50 },
		requirements: {},
		effects: {},
		visual: {},
	},
	black_market: {
		code: "BM_NEW",
		name: "New item",
		name_fa: "آیتم جدید",
		item_type: "modifier",
		effect_type: "PROBABILITY_MODIFIER",
		effect: { value: 1 },
		duration_turns: 1,
		cost: 0,
		availability: {},
		stackable: false,
	},
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
	visibility: "سطح نمایش",
	general: "عمومی",
};

function MetricCard({
	label,
	value,
	tone = "cyan",
}: {
	label: string;
	value: number;
	tone?: "cyan" | "amber" | "violet" | "emerald";
}) {
	const toneClass = {
		cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-200 border-cyan-400/20",
		amber:
			"from-amber-500/20 to-amber-500/5 text-amber-200 border-amber-400/20",
		violet:
			"from-violet-500/20 to-violet-500/5 text-violet-200 border-violet-400/20",
		emerald:
			"from-emerald-500/20 to-emerald-500/5 text-emerald-200 border-emerald-400/20",
	}[tone];
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			whileHover={{ y: -5, scale: 1.02 }}
			transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
			className={`rounded-2xl border bg-gradient-to-br p-4 ${toneClass}`}
		>
			<div className="text-3xl font-black tabular-nums">
				{value.toLocaleString("fa-IR")}
			</div>
			<div className="mt-1 text-xs text-slate-400">{label}</div>
		</motion.div>
	);
}

function CollectionEditor({
	collectionKey,
	items,
	onChange,
}: {
	collectionKey: CollectionKey;
	items: unknown[];
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
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	const filtered = records
		.map((item, index) => ({ item, index }))
		.filter(({ item, index }) =>
			`${entityTitle(item, index)} ${entityKey(item, index)}`
				.toLowerCase()
				.includes(query.toLowerCase()),
		);
	const selected = records[selectedIndex] ?? null;

	useEffect(() => {
		setDraft(selected ? JSON.stringify(selected, null, 2) : "");
		setError(null);
	}, [selected]);

	const save = () => {
		try {
			const parsed = toRecord(JSON.parse(draft) as unknown);
			if (!parsed) throw new Error("مقدار باید یک شیء JSON باشد.");
			const next = [...records];
			next[selectedIndex] = parsed;
			onChange(next);
			setError(null);
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : "JSON معتبر نیست.",
			);
		}
	};

	const add = () => {
		const next = [...records, structuredClone(INITIAL_ITEM[collectionKey])];
		onChange(next);
		setSelectedIndex(next.length - 1);
	};

	const remove = () => {
		if (!selected) return;
		const next = records.filter((_, index) => index !== selectedIndex);
		onChange(next);
		setSelectedIndex(Math.max(0, selectedIndex - 1));
	};

	return (
		<div className="grid min-h-[580px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
			<Card className="border-white/10 bg-slate-950/55 text-slate-100">
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
				<CardContent>
					<ScrollArea className="h-[430px] pl-2">
						<div className="space-y-2">
							{filtered.map(({ item, index }) => (
								<button
									key={`${entityKey(item, index)}-${index}`}
									type="button"
									onClick={() => setSelectedIndex(index)}
									className={`w-full rounded-xl border p-3 text-right transition ${selectedIndex === index ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}
								>
									<div className="line-clamp-1 text-sm font-bold">
										{entityTitle(item, index)}
									</div>
									<div
										dir="ltr"
										className="mt-1 truncate text-left font-mono text-[10px] text-slate-500"
									>
										{entityKey(item, index)}
									</div>
								</button>
							))}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
			<Card className="border-white/10 bg-slate-950/55 text-slate-100">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<div className="text-xs text-cyan-300">ویرایش پیشرفته</div>
							<CardTitle className="mt-1">
								{selected
									? entityTitle(selected, selectedIndex)
									: "موردی انتخاب نشده"}
							</CardTitle>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={remove}
							disabled={!selected}
							className="border-rose-400/30 text-rose-300 hover:bg-rose-500/10"
						>
							<Trash2 className="size-4" /> حذف
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm leading-7 text-slate-400">
						همه فیلدهای قرارداد v2 بدون تغییر نام در این ویرایشگر نگه‌داری
						می‌شوند. تغییرها روی یک نسخه کپی‌شده اعمال می‌شوند.
					</p>
					<Textarea
						dir="ltr"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						disabled={!selected}
						className="min-h-[390px] border-white/10 bg-slate-950 font-mono text-xs leading-6 text-slate-200"
					/>
					{error && (
						<div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
							{error}
						</div>
					)}
					<Button
						onClick={save}
						disabled={!selected}
						className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
					>
						ثبت تغییر در پیش‌نویس
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

export default function AdminGamePlanPage() {
	const { logout } = useAdminAuth();
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
			setValidationErrors(client.errors);
			setNotice({
				tone: client.valid ? "success" : "error",
				text: client.valid
					? "سناریوی پیش‌فرض بارگذاری شد و اعتبارسنجی محلی را با موفقیت گذراند."
					: `${client.errors.length} خطای محلی در سناریوی پیش‌فرض پیدا شد.`,
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
			setValidationErrors(client.errors);
			setServerValidated(false);
			setNotice({
				tone: "error",
				text: `${client.errors.length} خطا پیش از ارسال به سرور پیدا شد.`,
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
					? "اعتبارسنجی خشک سرور موفق بود؛ برنامه آماده انتشار است."
					: `${response.errors.length} خطای سرور باید برطرف شود.`,
			});
			return response.valid;
		} catch (error) {
			setServerValidated(false);
			setNotice({
				tone: "error",
				text: parseApiError(error, "اعتبارسنجی سرور ناموفق بود.").message,
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
			setSource("published");
			setNotice({
				tone: "success",
				text: `بازی با شناسه ${response.gameId} منتشر شد.`,
			});
		} catch (error) {
			setNotice({
				tone: "error",
				text: parseApiError(error, "انتشار برنامه ناموفق بود.").message,
			});
		} finally {
			setBusy(null);
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
			validationErrors.reduce<Record<string, GamePlanValidationError[]>>(
				(groups, error) => {
					const group =
						"group" in error && typeof error.group === "string"
							? error.group
							: error.loc.split("[")[0] || "general";
					groups[group] = [...(groups[group] ?? []), error];
					return groups;
				},
				{},
			),
		[validationErrors],
	);

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#070b17] text-slate-100 [background-image:radial-gradient(circle_at_15%_10%,rgba(8,145,178,.16),transparent_27%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,.14),transparent_22%)]">
			<motion.div
				className="pointer-events-none absolute -right-48 -top-48 size-[560px] rounded-full bg-cyan-400/10 blur-3xl"
				animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY }}
			/>
			<div className="relative mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
				<motion.header
					initial={{ opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
				>
					<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
								<GitBranch className="size-7" />
							</div>
							<div>
								<div className="mb-1 flex items-center gap-2 text-xs text-cyan-300">
									<Activity className="size-3.5" /> مرکز طراحی عملیات v2
								</div>
								<h1 className="text-2xl font-black tracking-tight lg:text-3xl">
									سازنده برنامه بازی موضوع‌محور
								</h1>
								<p className="mt-2 text-sm text-slate-400">
									هدف ← موضوع ← زیرموضوع ← سناریو ← گام ← کنش
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge className="border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
								<ShieldCheck className="size-3.5" /> نشست مدیر فعال
							</Badge>
							<Badge className="border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-violet-200">
								نسخه {plan?.version ?? "۲.۰"}
							</Badge>
							<Badge className="border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
								منبع: {sourceLabel[source]}
							</Badge>
							<Button
								variant="outline"
								size="sm"
								onClick={logout}
								className="border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200"
							>
								<LogOut className="size-4" /> خروج
							</Button>
						</div>
					</div>
				</motion.header>

				<AnimatePresence>
					{notice && (
						<motion.div
							initial={{ opacity: 0, y: -8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8 }}
							className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${notice.tone === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : notice.tone === "error" ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"}`}
						>
							{notice.tone === "success" ? (
								<CheckCircle2 className="mt-0.5 size-5 shrink-0" />
							) : (
								<AlertTriangle className="mt-0.5 size-5 shrink-0" />
							)}
							<span>{notice.text}</span>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
					<motion.aside
						initial={{ opacity: 0, x: 18 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.1, duration: 0.45 }}
						className="h-fit rounded-3xl border border-white/10 bg-slate-950/55 p-3 backdrop-blur-xl xl:sticky xl:top-5"
					>
						<div className="px-3 pb-3 pt-2 text-xs font-bold text-slate-500">
							بخش‌های برنامه بازی
						</div>
						<nav className="space-y-1">
							{TAB_ITEMS.map((tab, index) => (
								<motion.button
									type="button"
									key={tab.key}
									onClick={() => setActiveTab(tab.key)}
									whileHover={{ x: -3 }}
									whileTap={{ scale: 0.98 }}
									className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${activeTab === tab.key ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}
								>
									<span>
										{index + 1}. {tab.label}
									</span>
									<ChevronLeft className="size-4 opacity-60" />
								</motion.button>
							))}
						</nav>
					</motion.aside>

					<AnimatePresence mode="wait">
						<motion.section
							key={activeTab}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
							className="min-w-0"
						>
							{activeTab === "overview" && (
								<div className="space-y-5">
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
										<MetricCard
											label="تعداد اهداف"
											value={summary.goals}
											tone="violet"
										/>
										<MetricCard
											label="تعداد موضوع‌ها"
											value={summary.subjects}
										/>
										<MetricCard
											label="تعداد زیرموضوع‌ها"
											value={summary.subSubjects}
										/>
										<MetricCard
											label="تعداد سناریوها"
											value={summary.scenarios}
											tone="amber"
										/>
										<MetricCard
											label="تعداد گام‌ها"
											value={summary.steps}
											tone="emerald"
										/>
										<MetricCard label="تعداد کنش‌ها" value={summary.actions} />
										<MetricCard
											label="آیتم‌های بازار سیاه"
											value={summary.market}
											tone="violet"
										/>
										<MetricCard
											label="رویدادهای پوشش‌داده‌شده"
											value={summary.visibility}
											tone="emerald"
										/>
										<MetricCard
											label="اعضای انتخاب‌شده"
											value={summary.members}
											tone="amber"
										/>
									</div>
									<Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-l from-cyan-500/10 via-slate-950/80 to-violet-500/10 text-slate-100">
										<CardContent className="flex flex-col items-start justify-between gap-6 p-7 lg:flex-row lg:items-center">
											<div className="max-w-2xl">
												<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
													<Sparkles className="size-3.5" /> بسته رسمی زیرساخت
													شهری
												</div>
												<h2 className="text-2xl font-black">
													از سناریوی پیش‌فرض شروع کنید
												</h2>
												<p className="mt-3 leading-8 text-slate-400">
													داده اصلی بدون دست‌کاری بارگذاری می‌شود؛ سپس یک کپی قابل
													ویرایش برای شما ساخته خواهد شد. پیش از انتشار،
													اعتبارسنجی محلی و dry-run سرور اجرا می‌شود.
												</p>
											</div>
											<div className="flex flex-wrap gap-3">
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
													استفاده از سناریوی پیش‌فرض
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
									<div className="grid gap-4 lg:grid-cols-3">
										<Card className="border-white/10 bg-slate-950/55 text-slate-100">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<Database className="size-5 text-cyan-300" /> منبع
													داده
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-black">
													{sourceLabel[source]}
												</div>
												<p className="mt-2 text-sm text-slate-500">
													فایل پیش‌فرض در زمان اجرا بارگذاری می‌شود و وارد bundle
													جاوااسکریپت نمی‌شود.
												</p>
											</CardContent>
										</Card>
										<Card className="border-white/10 bg-slate-950/55 text-slate-100">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<FileCheck2 className="size-5 text-emerald-300" />{" "}
													کامل‌بودن قرارداد
												</CardTitle>
											</CardHeader>
											<CardContent>
												<Progress value={plan ? 100 : 0} className="mb-3" />
												<p className="text-sm text-slate-400">
													{plan
														? "همه مجموعه‌های الزامی v2 در پیش‌نویس حاضرند."
														: "ابتدا یک منبع داده انتخاب کنید."}
												</p>
											</CardContent>
										</Card>
										<Card className="border-white/10 bg-slate-950/55 text-slate-100">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<ShieldCheck className="size-5 text-violet-300" />{" "}
													وضعیت اعتبارسنجی
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div
													className={`text-xl font-black ${serverValidated ? "text-emerald-300" : "text-amber-300"}`}
												>
													{serverValidated
														? "تأییدشده توسط سرور"
														: validationErrors.length > 0
															? `${validationErrors.length} خطا`
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
													اجرای اعتبارسنجی
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

							{(
								[
									"goals",
									"subjects",
									"sub_subjects",
									"scenarios",
									"scenario_steps",
									"actions",
									"black_market",
									"impact_rules",
								] as const
							).includes(activeTab as CollectionKey) &&
								plan && (
									<CollectionEditor
										collectionKey={activeTab as CollectionKey}
										items={
											(plan[activeTab as CollectionKey] ?? []) as unknown[]
										}
										onChange={(items) =>
											updateCollection(activeTab as CollectionKey, items)
										}
									/>
								)}

							{activeTab === "government" && (
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
															<span className="text-slate-500">
																کاربر فرمانده
															</span>
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
							)}

							{activeTab === "visibility_config" && (
								<Card className="border-white/10 bg-slate-950/55 text-slate-100">
									<CardHeader>
										<CardTitle>تنظیمات نمایش رویدادها</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="mb-5 grid gap-4 sm:grid-cols-3">
											<MetricCard label="رویدادهای الزامی" value={66} />
											<MetricCard
												label="رویدادهای پیکربندی‌شده"
												value={summary.visibility}
												tone="emerald"
											/>
											<MetricCard
												label="دسترسی‌های بین‌سمتی"
												value={
													plan?.visibility_config.cross_side_result.grantees
														.length ?? 0
												}
												tone="amber"
											/>
										</div>
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
							)}

							{activeTab === "graph" && (
								<Card className="overflow-hidden border-white/10 bg-slate-950/55 text-slate-100">
									<CardContent className="relative min-h-[520px] p-0">
										<div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
										<div className="relative flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
											<div className="grid size-20 place-items-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
												<Boxes className="size-10" />
											</div>
											<h2 className="mt-6 text-3xl font-black">
												نقشه زنده برنامه بازی
											</h2>
											<p className="mt-3 max-w-xl leading-8 text-slate-400">
												هر بار یک موضوع را انتخاب کنید و مسیر فشرده آن را از هدف
												تا کنش ببینید؛ اثرها و پادکنش‌ها نیز در یک لایه اختیاری
												نمایش داده می‌شوند.
											</p>
											<div className="mt-6 flex flex-wrap justify-center gap-3">
												<Badge className="bg-violet-500/15 text-violet-200">
													{summary.goals} هدف
												</Badge>
												<Badge className="bg-cyan-500/15 text-cyan-200">
													{summary.subjects} موضوع
												</Badge>
												<Badge className="bg-emerald-500/15 text-emerald-200">
													{summary.steps} گام
												</Badge>
											</div>
											<Link href="/admin/game-plan/graph" className="mt-7">
												<Button className="h-12 bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
													<GitBranch className="size-5" /> بازکردن گراف تعاملی
												</Button>
											</Link>
										</div>
									</CardContent>
								</Card>
							)}

							{activeTab === "publish" && (
								<div className="space-y-5">
									<Card className="border-white/10 bg-slate-950/55 text-slate-100">
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<CloudUpload className="text-cyan-300" /> اعتبارسنجی و
												انتشار
											</CardTitle>
										</CardHeader>
										<CardContent className="grid gap-5 lg:grid-cols-[1fr_auto]">
											<div>
												<p className="leading-8 text-slate-400">
													ابتدا ارجاع‌ها، سهم ۱۰۰٪، ترتیب گام‌ها، هدف اثرها و پوشش
													رویدادها در مرورگر بررسی می‌شوند. فقط پس از dry-run
													موفق سرور، انتشار فعال می‌شود.
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
														اعتبارسنجی محلی و سرور
													</Button>
													<Button
														onClick={() => void publish()}
														disabled={
															!plan || busy !== null || !serverValidated
														}
														className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
													>
														{busy === "publish" ? (
															<LoaderCircle className="size-4 animate-spin" />
														) : (
															<CloudUpload className="size-4" />
														)}{" "}
														انتشار با configure_all
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
													<div
														key={`${error.loc}-${error.code}-${index}`}
														className="rounded-xl border border-white/5 bg-slate-950/40 p-3"
													>
														<div className="flex flex-wrap items-center gap-2">
															<code className="text-xs text-rose-300">
																{error.code}
															</code>
															<span className="text-xs text-slate-600">
																{error.loc}
															</span>
														</div>
														<p className="mt-1 text-sm text-slate-300">
															{error.message}
														</p>
													</div>
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
											از نمای کلی، سناریوی پیش‌فرض یا نسخه منتشرشده را انتخاب
											کنید.
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
						</motion.section>
					</AnimatePresence>
				</div>
			</div>
		</main>
	);
}
