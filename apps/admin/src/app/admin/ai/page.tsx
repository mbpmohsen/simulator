"use client";

import type { AiAssistantLevelConfig } from "@workspace/trpc";
import { parseApiError } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	GitBranch,
	LoaderCircle,
	LogOut,
	Plus,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminAuth } from "@/components/AdminAuthGate";
import { loadAiAssistantConfig, saveAiAssistantConfig } from "@/lib/game-plan";

interface LevelRow {
	id: string;
	cost: string;
	name: string;
	name_fa: string;
	description: string;
	description_fa: string;
	extra: Record<string, unknown>;
}

type BusyState = "load" | "save" | null;
type Notice = { tone: "success" | "error" | "info"; text: string };

const RESERVED_LEVEL_FIELDS = new Set([
	"level",
	"cost",
	"name",
	"name_fa",
	"description",
	"description_fa",
]);

const DEFAULT_ROWS: LevelRow[] = [
	{
		id: "suggested-1",
		cost: "50",
		name: "Basic",
		name_fa: "پایه",
		description: "Basic subject summary",
		description_fa: "خلاصه پایه موضوع",
		extra: {},
	},
	{
		id: "suggested-2",
		cost: "120",
		name: "Advanced",
		name_fa: "پیشرفته",
		description: "Scenario comparison and metrics",
		description_fa: "مقایسه سناریوها و شاخص‌ها",
		extra: {},
	},
];

const formatNumberFa = (value: number): string =>
	value.toLocaleString("fa-IR", { maximumFractionDigits: 3 });

const cloneDefaultRows = (): LevelRow[] =>
	DEFAULT_ROWS.map((row) => ({ ...row, extra: { ...row.extra } }));

const rowFromLevel = (level: AiAssistantLevelConfig): LevelRow => {
	const extra = Object.fromEntries(
		Object.entries(level).filter(([key]) => !RESERVED_LEVEL_FIELDS.has(key)),
	);
	return {
		id: `server-level-${level.level}`,
		cost: String(level.cost ?? 0),
		name: typeof level.name === "string" ? level.name : "",
		name_fa: typeof level.name_fa === "string" ? level.name_fa : "",
		description: typeof level.description === "string" ? level.description : "",
		description_fa:
			typeof level.description_fa === "string" ? level.description_fa : "",
		extra,
	};
};

const rowsFromLevels = (levels: AiAssistantLevelConfig[]): LevelRow[] =>
	[...levels].sort((left, right) => left.level - right.level).map(rowFromLevel);

const getLevelLabel = (row: LevelRow, index: number): string =>
	row.name_fa.trim() || row.name.trim() || `سطح ${formatNumberFa(index + 1)}`;

export default function AdminAiAssistantPage() {
	const { logout } = useAdminAuth();
	const [rows, setRows] = useState<LevelRow[]>(cloneDefaultRows);
	const [gameId, setGameId] = useState<string | null>(null);
	const [busy, setBusy] = useState<BusyState>("load");
	const [notice, setNotice] = useState<Notice | null>(null);
	const nextDraftId = useRef(1);

	const hasExtraFields = useMemo(
		() => rows.some((row) => Object.keys(row.extra).length > 0),
		[rows],
	);

	const load = useCallback(async () => {
		setBusy("load");
		setNotice(null);
		try {
			const response = await loadAiAssistantConfig();
			setRows(rowsFromLevels(response.levels));
			setGameId(response.game_id);
			setNotice({
				tone: "success",
				text: "نردبان دستیار هوشمند از سرور دریافت شد.",
			});
		} catch (error) {
			const parsed = parseApiError(
				error,
				"دریافت نردبان دستیار هوشمند ممکن نشد.",
			);
			if (parsed.status === 404 && parsed.code === "AI_CONFIG_NOT_SET") {
				setRows(cloneDefaultRows());
				setGameId(null);
				setNotice({
					tone: "info",
					text: "تنظیمات دستیار هوش مصنوعی هنوز ثبت نشده است؛ از مقدار پیشنهادی شروع کنید.",
				});
			} else {
				setNotice({ tone: "error", text: parsed.message });
				if (parsed.status === 401 || parsed.status === 403) logout();
			}
		} finally {
			setBusy(null);
		}
	}, [logout]);

	useEffect(() => {
		void load();
	}, [load]);

	const updateRow = (
		index: number,
		field: keyof Pick<
			LevelRow,
			"cost" | "name" | "name_fa" | "description" | "description_fa"
		>,
		value: string,
	) => {
		setRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index ? { ...row, [field]: value } : row,
			),
		);
	};

	const addRow = () => {
		const id = `draft-${nextDraftId.current}`;
		nextDraftId.current += 1;
		setRows((current) => [
			...current,
			{
				id,
				cost: "0",
				name: `Level ${current.length + 1}`,
				name_fa: "",
				description: "",
				description_fa: "",
				extra: {},
			},
		]);
	};

	const removeRow = (index: number) => {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	};

	const buildPayload = (): AiAssistantLevelConfig[] | null => {
		if (rows.length === 0) {
			setNotice({
				tone: "error",
				text: "حداقل سطح ۱ باید برای دستیار هوشمند تعریف شود.",
			});
			return null;
		}

		const levels: AiAssistantLevelConfig[] = [];
		for (const [index, row] of rows.entries()) {
			const cost = Number(row.cost);
			if (!Number.isFinite(cost) || cost < 0) {
				setNotice({
					tone: "error",
					text: `هزینه سطح ${formatNumberFa(index + 1)} باید عددی نامنفی باشد.`,
				});
				return null;
			}
			const nextLevel = {
				...row.extra,
				level: index + 1,
				cost,
			} as AiAssistantLevelConfig;
			const name = row.name.trim();
			const nameFa = row.name_fa.trim();
			const description = row.description.trim();
			const descriptionFa = row.description_fa.trim();
			if (name) nextLevel.name = name;
			if (nameFa) nextLevel.name_fa = nameFa;
			if (description) nextLevel.description = description;
			if (descriptionFa) nextLevel.description_fa = descriptionFa;
			levels.push(nextLevel);
		}
		const levelNumbers = levels.map((level) => level.level);
		if (new Set(levelNumbers).size !== levelNumbers.length) {
			setNotice({ tone: "error", text: "سطح تکراری است." });
			return null;
		}
		if (!levelNumbers.every((level, index) => level === index + 1)) {
			setNotice({
				tone: "error",
				text: "سطح‌ها باید از ۱ شروع شوند و پشت‌سرهم باشند.",
			});
			return null;
		}
		return levels;
	};

	const save = async () => {
		const levels = buildPayload();
		if (!levels) return;
		setBusy("save");
		setNotice(null);
		try {
			const response = await saveAiAssistantConfig(levels);
			setRows(rowsFromLevels(response.levels));
			setGameId(response.game_id);
			setNotice({
				tone: "success",
				text: "نردبان دستیار هوشمند ذخیره شد.",
			});
		} catch (error) {
			const parsed = parseApiError(
				error,
				"ذخیره نردبان دستیار هوشمند ناموفق بود.",
			);
			setNotice({ tone: "error", text: parsed.message });
			if (parsed.status === 401 || parsed.status === 403) logout();
		} finally {
			setBusy(null);
		}
	};

	return (
		<main
			dir="rtl"
			className="relative min-h-screen overflow-hidden bg-[#070b17] text-slate-100 [background-image:radial-gradient(circle_at_15%_10%,rgba(8,145,178,.16),transparent_27%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,.14),transparent_22%)]"
		>
			<motion.div
				className="pointer-events-none absolute -right-48 -top-48 size-[560px] rounded-full bg-cyan-400/10 blur-3xl"
				animate={{ scale: [1, 1.16, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
			/>
			<div className="relative mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-8">
				<header className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
					<div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
						<div className="flex items-center gap-4">
							<div className="grid size-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
								<Bot className="size-7" />
							</div>
							<div>
								<div className="mb-1 text-xs text-cyan-300">
									ویژگی پولی مستقل از configure_all
								</div>
								<h1 className="text-2xl font-black tracking-tight lg:text-3xl">
									پیکربندی دستیار هوشمند
								</h1>
								<p className="mt-2 text-sm text-slate-400">
									نردبان سطح‌ها باید از ۱ شروع شود و هر سطح هزینه اعتباری نامنفی
									داشته باشد.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								asChild
								variant="outline"
								size="sm"
								className="border-white/10 bg-white/5"
							>
								<Link href="/admin/game-plan">
									<GitBranch className="size-4" /> سازنده بازی
								</Link>
							</Button>
							<Badge className="border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
								{gameId ? `بازی ${gameId}` : "در انتظار ذخیره"}
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
				</header>

				<AnimatePresence>
					{notice && (
						<motion.div
							initial={{ opacity: 0, y: -8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8 }}
							className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
								notice.tone === "success"
									? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
									: notice.tone === "error"
										? "border-rose-400/20 bg-rose-500/10 text-rose-100"
										: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
							}`}
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

				<Card className="border-white/10 bg-slate-950/60 text-slate-100 backdrop-blur-xl">
					<CardHeader className="gap-4 border-b border-white/10">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle className="flex items-center gap-2 text-lg">
									<Bot className="size-5 text-cyan-300" /> تنظیمات دستیار هوش
									مصنوعی
								</CardTitle>
								<p className="mt-2 text-sm text-slate-400">
									شماره سطح‌ها در رابط کاربری خودکار و پیوسته نگه داشته می‌شود.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => void load()}
									disabled={busy !== null}
									className="border-white/10 bg-white/5"
								>
									<RefreshCw
										className={`size-4 ${busy === "load" ? "animate-spin" : ""}`}
									/>
									بارگذاری
								</Button>
								<Button
									type="button"
									onClick={() => void save()}
									disabled={busy !== null}
									className="bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300"
								>
									{busy === "save" ? (
										<LoaderCircle className="size-4 animate-spin" />
									) : (
										<Save className="size-4" />
									)}
									ذخیره تنظیمات دستیار هوش مصنوعی
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4 p-5">
						{hasExtraFields && (
							<div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
								فیلدهای نمایشی اضافی که سرور برگردانده، هنگام ذخیره حفظ می‌شوند.
							</div>
						)}

						<div className="space-y-3">
							{rows.map((row, index) => (
								<div
									key={row.id}
									className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)_160px_auto]"
								>
									<div>
										<Label className="text-slate-400">سطح</Label>
										<div className="mt-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-center font-black text-cyan-100">
											{formatNumberFa(index + 1)}
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor={`ai-name-${index}`}>نام</Label>
										<Input
											id={`ai-name-${index}`}
											value={row.name}
											onChange={(event) =>
												updateRow(index, "name", event.target.value)
											}
											placeholder={`Level ${index + 1}`}
											dir="ltr"
											className="border-white/10 bg-slate-950/70 text-left text-slate-100"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor={`ai-name-fa-${index}`}>نام فارسی</Label>
										<Input
											id={`ai-name-fa-${index}`}
											value={row.name_fa}
											onChange={(event) =>
												updateRow(index, "name_fa", event.target.value)
											}
											placeholder="نام نمایشی"
											className="border-white/10 bg-slate-950/70 text-slate-100"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor={`ai-cost-${index}`}>هزینه</Label>
										<Input
											id={`ai-cost-${index}`}
											type="number"
											min={0}
											step="1"
											value={row.cost}
											onChange={(event) =>
												updateRow(index, "cost", event.target.value)
											}
											dir="ltr"
											className="border-white/10 bg-slate-950/70 text-left text-slate-100"
										/>
									</div>
									<div className="flex items-end">
										<Button
											type="button"
											variant="outline"
											onClick={() => removeRow(index)}
											disabled={rows.length <= 1 || busy !== null}
											className="w-full border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
										>
											<Trash2 className="size-4" />
											حذف
										</Button>
									</div>
									<div className="space-y-2 lg:col-start-2 lg:col-end-4">
										<Label htmlFor={`ai-description-${index}`}>توضیح</Label>
										<Input
											id={`ai-description-${index}`}
											value={row.description}
											onChange={(event) =>
												updateRow(index, "description", event.target.value)
											}
											placeholder="Description"
											dir="ltr"
											className="border-white/10 bg-slate-950/70 text-left text-slate-100"
										/>
									</div>
									<div className="space-y-2 lg:col-start-4 lg:col-end-6">
										<Label htmlFor={`ai-description-fa-${index}`}>
											توضیح فارسی
										</Label>
										<Input
											id={`ai-description-fa-${index}`}
											value={row.description_fa}
											onChange={(event) =>
												updateRow(index, "description_fa", event.target.value)
											}
											placeholder="توضیح سطح"
											className="border-white/10 bg-slate-950/70 text-slate-100"
										/>
									</div>
								</div>
							))}
						</div>

						<div className="flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
							<div className="text-sm text-slate-400">
								{rows.length > 0
									? `سطح بعدی پس از ذخیره: ${getLevelLabel(rows[rows.length - 1], rows.length - 1)}`
									: "سطحی تعریف نشده است."}
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={addRow}
								disabled={busy !== null}
								className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
							>
								<Plus className="size-4" />
								افزودن سطح بعدی
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
