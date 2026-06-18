"use client";

import {
	type AdminGameCatalogEntry,
	createGameServerApi,
	type TurnAnalyticsDetailData,
	type TurnAnalyticsPlot,
	type TurnAnalyticsSummary,
} from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
	Activity,
	AlertTriangle,
	BarChart3,
	Calculator,
	CheckCircle2,
	Clock,
	Database,
	FileClock,
	Gauge,
	ImageIcon,
	Link2,
	LogOut,
	Radio,
	RefreshCw,
	ShieldCheck,
	SlidersHorizontal,
	Target,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE_URL =
	process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://game.darkube.ir";
const ADMIN_TOKEN_STORAGE_KEY = "simulator-admin-token";
const DEFAULT_SUMMARY_LIMIT = 50;

interface AnalyticsEvent {
	seq: number;
	type: string;
	payload: Record<string, unknown>;
	createdAt?: string;
}

type StreamState = "idle" | "connecting" | "live" | "error";

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

const getString = (
	record: Record<string, unknown> | null,
	key: string,
): string | null => {
	const value = record?.[key];
	if (typeof value === "string" && value.trim()) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
};

const getNumber = (
	record: Record<string, unknown> | null,
	key: string,
): number | null => {
	const value = record?.[key];
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const getBoolean = (
	record: Record<string, unknown> | null,
	key: string,
): boolean | null => {
	const value = record?.[key];
	return typeof value === "boolean" ? value : null;
};

const unwrapData = <T,>(response: unknown): T | null => {
	const record = asRecord(response);
	if (!record) return null;
	if ("data" in record) return record.data as T;
	return response as T;
};

const resolveApiErrorMessage = (error: unknown, fallback: string): string => {
	const record = asRecord(error);
	const response = asRecord(record?.response);
	const data = asRecord(response?.data);
	const detail = data?.detail;
	if (typeof detail === "string" && detail.trim()) return detail;
	const nestedDetail = asRecord(detail);
	if (typeof nestedDetail?.message === "string") return nestedDetail.message;
	if (typeof data?.message === "string" && data.message.trim())
		return data.message;
	if (typeof record?.message === "string" && record.message.trim())
		return record.message;
	return fallback;
};

const formatTimestamp = (value: number | string | null | undefined): string => {
	if (value === null || value === undefined) return "در انتظار";
	const date =
		typeof value === "number"
			? new Date(value < 10_000_000_000 ? value * 1000 : value)
			: new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("fa-IR", {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const formatNumber = (value: unknown): string => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 3 }).format(
			value,
		);
	}
	if (typeof value === "string" && value.trim()) return value;
	return "-";
};

const streamStateLabel = (state: StreamState): string => {
	if (state === "connecting") return "در حال اتصال";
	if (state === "live") return "زنده";
	if (state === "error") return "خطا";
	return "آماده";
};

const safeJson = (value: unknown): string => {
	try {
		return JSON.stringify(value ?? {}, null, 2);
	} catch {
		return String(value);
	}
};

const normalizeGameId = (value: unknown): string | null => {
	if (typeof value === "string" && value.trim()) return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
};

const normalizeCatalogGame = (value: unknown): AdminGameCatalogEntry | null => {
	const record = asRecord(value);
	const gameId = normalizeGameId(record?.gameId ?? record?.game_id);
	if (!record || !gameId) return null;
	const sides = Array.isArray(record.sides)
		? record.sides.filter((item): item is string => typeof item === "string")
		: [];
	return {
		...record,
		gameId,
		status: getString(record, "status"),
		phase: getString(record, "phase"),
		currentTurn:
			getNumber(record, "currentTurn") ?? getNumber(record, "current_turn"),
		totalTurns:
			getNumber(record, "totalTurns") ?? getNumber(record, "total_turns"),
		pointThreshold:
			getNumber(record, "pointThreshold") ??
			getNumber(record, "point_threshold"),
		currentPhase:
			getString(record, "currentPhase") ?? getString(record, "current_phase"),
		createdAt:
			getString(record, "createdAt") ?? getString(record, "created_at"),
		governmentEnabled:
			getBoolean(record, "governmentEnabled") ??
			getBoolean(record, "government_enabled"),
		sides,
		turnAnalyticsCount:
			getNumber(record, "turnAnalyticsCount") ??
			getNumber(record, "turn_analytics_count") ??
			0,
		lastAnalyticsTurn:
			getNumber(record, "lastAnalyticsTurn") ??
			getNumber(record, "last_analytics_turn"),
		plotCount:
			getNumber(record, "plotCount") ?? getNumber(record, "plot_count") ?? 0,
		hasStoredAnalytics:
			getBoolean(record, "hasStoredAnalytics") ??
			getBoolean(record, "has_stored_analytics") ??
			false,
		hasStoredPlots:
			getBoolean(record, "hasStoredPlots") ??
			getBoolean(record, "has_stored_plots") ??
			false,
		isActive:
			getBoolean(record, "isActive") ??
			getBoolean(record, "is_active") ??
			false,
	};
};

const normalizeSummary = (value: unknown): TurnAnalyticsSummary | null => {
	const record = asRecord(value);
	const turn = getNumber(record, "turn");
	if (!record || turn === null) return null;
	const bestTargets = asRecord(record.bestTargets ?? record.best_targets);
	return {
		...record,
		turn,
		createdAt: record.createdAt as number | string | null | undefined,
		actionCount:
			getNumber(record, "actionCount") ??
			getNumber(record, "action_count") ??
			0,
		comparisonCount:
			getNumber(record, "comparisonCount") ??
			getNumber(record, "comparison_count") ??
			0,
		teamCount:
			getNumber(record, "teamCount") ?? getNumber(record, "team_count") ?? 0,
		plotCount:
			getNumber(record, "plotCount") ?? getNumber(record, "plot_count") ?? 0,
		bestTargets: bestTargets
			? Object.fromEntries(
					Object.entries(bestTargets).map(([key, item]) => [key, String(item)]),
				)
			: {},
	};
};

const mathematicsTeams = (
	detail: TurnAnalyticsDetailData | null,
): [string, Record<string, unknown>][] => {
	const math = asRecord(detail?.mathematics);
	const teams = asRecord(math?.teams);
	return teams
		? Object.entries(teams).flatMap(([name, value]) => {
				const record = asRecord(value);
				return record
					? [[name, record] as [string, Record<string, unknown>]]
					: [];
			})
		: [];
};

const flowActions = (
	detail: TurnAnalyticsDetailData | null,
): Record<string, unknown>[] => {
	const flow = asRecord(detail?.flow);
	return asArray(flow?.actions).flatMap((item) => {
		const record = asRecord(item);
		return record ? [record] : [];
	});
};

const comparisonRows = (
	detail: TurnAnalyticsDetailData | null,
): Record<string, unknown>[] =>
	asArray(detail?.comparison).flatMap((item) => {
		const record = asRecord(item);
		return record ? [record] : [];
	});

const plots = (detail: TurnAnalyticsDetailData | null): TurnAnalyticsPlot[] =>
	asArray(detail?.plots).flatMap((item) => {
		const record = asRecord(item);
		return record ? [record as TurnAnalyticsPlot] : [];
	});

const deriveBestTargets = (
	detail: TurnAnalyticsDetailData,
): Record<string, string> => {
	const entries = mathematicsTeams(detail).map(([teamName, values]) => [
		teamName,
		getString(values, "best_target") ?? getString(values, "bestTarget") ?? "-",
	]);
	return Object.fromEntries(entries);
};

const summaryFromDetail = (
	detail: TurnAnalyticsDetailData,
): TurnAnalyticsSummary => ({
	turn: detail.turn,
	createdAt: detail.createdAt,
	actionCount: flowActions(detail).length,
	comparisonCount: comparisonRows(detail).length,
	teamCount: mathematicsTeams(detail).length,
	plotCount: plots(detail).length,
	bestTargets: deriveBestTargets(detail),
});

const mergeSummary = (
	current: TurnAnalyticsSummary[],
	incoming: TurnAnalyticsSummary,
): TurnAnalyticsSummary[] => {
	const byTurn = new Map(current.map((item) => [item.turn, item]));
	byTurn.set(incoming.turn, { ...byTurn.get(incoming.turn), ...incoming });
	return Array.from(byTurn.values()).sort((a, b) => a.turn - b.turn);
};

const parseSseData = (
	rawData: string,
	eventType: string,
): AnalyticsEvent | null => {
	try {
		const parsed = JSON.parse(rawData) as unknown;
		const record = asRecord(parsed);
		if (!record) return null;
		return {
			seq: getNumber(record, "seq") ?? getNumber(record, "id") ?? Date.now(),
			type: (getString(record, "type") ?? eventType) || "MESSAGE",
			payload: asRecord(record.payload) ?? record,
			createdAt:
				getString(record, "createdAt") ??
				getString(record, "created_at") ??
				undefined,
		};
	} catch {
		return {
			seq: Date.now(),
			type: eventType || "MESSAGE",
			payload: { message: rawData },
			createdAt: new Date().toISOString(),
		};
	}
};

const parseSseBlock = (block: string): AnalyticsEvent | null => {
	let eventType = "message";
	const dataLines: string[] = [];
	for (const line of block.split(/\r?\n/)) {
		if (line.startsWith("event:")) eventType = line.slice(6).trim();
		if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
	}
	if (dataLines.length === 0) return null;
	return parseSseData(dataLines.join("\n"), eventType);
};

const plotIsExpired = (plot: TurnAnalyticsPlot): boolean => {
	if (!plot.accessUrlExpiresAt) return false;
	return Date.now() > plot.accessUrlExpiresAt;
};

const MetricTile = ({
	icon,
	label,
	value,
	accent,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	accent: string;
}) => (
	<div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
		<div
			className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${accent}`}
		>
			{icon}
		</div>
		<div className="text-xs font-semibold text-slate-500">{label}</div>
		<div className="mt-2 truncate font-mono text-2xl font-black text-slate-50">
			{value}
		</div>
	</div>
);

const TurnTrendGraph = ({
	summaries,
	selectedTurn,
	onSelectTurn,
}: {
	summaries: TurnAnalyticsSummary[];
	selectedTurn: number | null;
	onSelectTurn: (turn: number) => void;
}) => {
	const items = summaries.slice(-12);
	const maxValue = Math.max(
		1,
		...items.flatMap((summary) => [
			summary.actionCount ?? 0,
			summary.comparisonCount ?? 0,
			summary.teamCount ?? 0,
			summary.plotCount ?? 0,
		]),
	);

	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2 font-semibold text-slate-50">
						<BarChart3 className="h-4 w-4 text-cyan-300" />
						نمای روند نوبت‌ها
					</div>
					<div className="mt-1 text-xs text-slate-400">
						مقایسه سریع عملیات، بررسی‌ها، تیم‌ها و نمودارهای ذخیره‌شده در هر نوبت
					</div>
				</div>
				<div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
					<span className="flex items-center gap-1">
						<span className="h-2 w-2 rounded-sm bg-cyan-400" /> عملیات
					</span>
					<span className="flex items-center gap-1">
						<span className="h-2 w-2 rounded-sm bg-emerald-400" /> بررسی
					</span>
					<span className="flex items-center gap-1">
						<span className="h-2 w-2 rounded-sm bg-amber-400" /> تیم
					</span>
					<span className="flex items-center gap-1">
						<span className="h-2 w-2 rounded-sm bg-violet-400" /> نمودار
					</span>
				</div>
			</div>
			{items.length === 0 ? (
				<div className="flex h-44 items-center justify-center rounded border border-dashed border-slate-700 text-sm text-slate-400">
					هنوز داده‌ای برای نمایش نمودار وجود ندارد.
				</div>
			) : (
				<div className="grid h-56 grid-cols-[repeat(auto-fit,minmax(44px,1fr))] items-end gap-2">
					{items.map((summary) => {
						const active = selectedTurn === summary.turn;
						const bars = [
							{
								key: "actions",
								value: summary.actionCount ?? 0,
								className: "bg-cyan-400",
							},
							{
								key: "checks",
								value: summary.comparisonCount ?? 0,
								className: "bg-emerald-400",
							},
							{
								key: "teams",
								value: summary.teamCount ?? 0,
								className: "bg-amber-400",
							},
							{
								key: "plots",
								value: summary.plotCount ?? 0,
								className: "bg-violet-400",
							},
						];
						return (
							<button
								key={summary.turn}
								type="button"
								onClick={() => onSelectTurn(summary.turn)}
								className={`flex h-full flex-col justify-end rounded-md border px-2 py-2 transition ${
									active
										? "border-cyan-400/70 bg-cyan-950/25"
										: "border-slate-800 bg-slate-950/40 hover:border-slate-600"
								}`}
							>
								<div className="flex h-40 items-end justify-center gap-1">
									{bars.map((bar) => (
										<span
											key={bar.key}
											className={`w-2 rounded-t ${bar.className}`}
											style={{
												height: `${Math.max(8, (bar.value / maxValue) * 100)}%`,
											}}
											title={`${bar.key}: ${bar.value}`}
										/>
									))}
								</div>
								<div className="mt-2 text-center text-[11px] text-slate-300">
									نوبت {formatNumber(summary.turn)}
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default function AdminAnalyticsPage() {
	const [adminPassword, setAdminPassword] = useState("");
	const [adminToken, setAdminToken] = useState("");
	const [authError, setAuthError] = useState<string | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(false);

	const [catalogGames, setCatalogGames] = useState<AdminGameCatalogEntry[]>([]);
	const [activeGameId, setActiveGameId] = useState<string | null>(null);
	const [selectedGameId, setSelectedGameId] = useState("");
	const [manualGameId, setManualGameId] = useState("");
	const [summaryLimit, setSummaryLimit] = useState(DEFAULT_SUMMARY_LIMIT);
	const [summaries, setSummaries] = useState<TurnAnalyticsSummary[]>([]);
	const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
	const [detail, setDetail] = useState<TurnAnalyticsDetailData | null>(null);
	const [liveEnabled, setLiveEnabled] = useState(true);
	const [streamState, setStreamState] = useState<StreamState>("idle");
	const [lastEvent, setLastEvent] = useState<AnalyticsEvent | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCatalogLoading, setIsCatalogLoading] = useState(false);
	const [isSummariesLoading, setIsSummariesLoading] = useState(false);
	const [isDetailLoading, setIsDetailLoading] = useState(false);
	const streamSeqRef = useRef(0);

	const api = useMemo(() => {
		if (!adminToken) return null;
		return createGameServerApi({ baseURL: BASE_URL, adminToken });
	}, [adminToken]);

	const selectedGame = useMemo(
		() => catalogGames.find((game) => game.gameId === selectedGameId) ?? null,
		[catalogGames, selectedGameId],
	);

	const latestSummary = summaries.at(-1) ?? null;
	const detailTeams = mathematicsTeams(detail);
	const detailActions = flowActions(detail);
	const detailComparisons = comparisonRows(detail);
	const detailPlots = plots(detail);

	const loadTurnDetail = useCallback(
		async (gameId: string, turn: number) => {
			if (!api || !gameId) return;
			setIsDetailLoading(true);
			setError(null);
			try {
				const response = await api.getTurnAnalytics(gameId, turn);
				const data = unwrapData<TurnAnalyticsDetailData>(response);
				if (!data) throw new Error("جزئیات تحلیل نوبت خالی است.");
				setDetail(data);
				setSelectedTurn(data.turn ?? turn);
				setSummaries((current) =>
					mergeSummary(current, summaryFromDetail(data)),
				);
				setStatusMessage(`تحلیل نوبت ${data.turn ?? turn} بارگذاری شد.`);
			} catch (err) {
				setError(
					resolveApiErrorMessage(err, "جزئیات تحلیل این نوبت در دسترس نیست."),
				);
			} finally {
				setIsDetailLoading(false);
			}
		},
		[api],
	);

	const loadSummaries = useCallback(
		async (gameId: string) => {
			if (!api || !gameId) return;
			setIsSummariesLoading(true);
			setError(null);
			try {
				const response = await api.listTurnAnalytics(gameId, {
					limit: summaryLimit,
				});
				const data = unwrapData<Record<string, unknown>>(response);
				const reports = asArray(data?.reports)
					.map((item) => normalizeSummary(item))
					.filter((item): item is TurnAnalyticsSummary => item !== null)
					.sort((a, b) => a.turn - b.turn);
				setSummaries(reports);
				const nextTurn =
					selectedTurn && reports.some((item) => item.turn === selectedTurn)
						? selectedTurn
						: (reports.at(-1)?.turn ?? null);
				setSelectedTurn(nextTurn);
				if (nextTurn !== null) {
					await loadTurnDetail(gameId, nextTurn);
				} else {
					setDetail(null);
					setStatusMessage("هنوز تحلیلی برای نوبت‌های این بازی ذخیره نشده است.");
				}
			} catch (err) {
				setSummaries([]);
				setDetail(null);
				setError(
					resolveApiErrorMessage(err, "فهرست تحلیل نوبت‌ها در دسترس نیست."),
				);
			} finally {
				setIsSummariesLoading(false);
			}
		},
		[api, loadTurnDetail, selectedTurn, summaryLimit],
	);

	const loadCatalog = useCallback(async () => {
		if (!api) return;
		setIsCatalogLoading(true);
		setError(null);
		try {
			const response = await api.getAdminGameCatalog();
			const data = unwrapData<Record<string, unknown>>(response);
			const games = asArray(data?.games)
				.map((item) => normalizeCatalogGame(item))
				.filter((item): item is AdminGameCatalogEntry => item !== null)
				.sort(
					(a, b) => Number(Boolean(b.isActive)) - Number(Boolean(a.isActive)),
				);
			const nextActiveGameId = normalizeGameId(
				data?.activeGameId ?? data?.active_game_id,
			);
			const preferredGameId = nextActiveGameId ?? games[0]?.gameId ?? "";
			setCatalogGames(games);
			setActiveGameId(nextActiveGameId);
			setSelectedGameId((current) => current || preferredGameId);
			setManualGameId((current) => current || preferredGameId);
			setStatusMessage(`${games.length} بازی در کاتالوگ آنالیتیکس پیدا شد.`);
		} catch (err) {
			setCatalogGames([]);
			setActiveGameId(null);
			setError(resolveApiErrorMessage(err, "کاتالوگ آنالیتیکس در دسترس نیست."));
		} finally {
			setIsCatalogLoading(false);
		}
	}, [api]);

	const refreshSelectedGame = useCallback(async () => {
		if (!selectedGameId) return;
		await loadSummaries(selectedGameId);
	}, [loadSummaries, selectedGameId]);

	const ingestAnalyticsEvent = useCallback((event: AnalyticsEvent) => {
		setLastEvent(event);
		streamSeqRef.current = Math.max(streamSeqRef.current, event.seq);
		if (event.type !== "TURN_ANALYTICS_RECORDED") return;
		const payload = event.payload;
		const report = asRecord(payload.report);
		const turn = getNumber(payload, "turn") ?? getNumber(report, "turn");
		if (!report || turn === null) return;
		const data = report as TurnAnalyticsDetailData;
		setDetail(data);
		setSelectedTurn(turn);
		setSummaries((current) => mergeSummary(current, summaryFromDetail(data)));
		setStatusMessage(`تحلیل زنده نوبت ${turn} دریافت شد.`);
	}, []);

	const loginAdmin = async () => {
		setIsAuthLoading(true);
		setAuthError(null);
		setError(null);
		try {
			const result = await createGameServerApi({
				baseURL: BASE_URL,
			}).adminLogin({
				password: adminPassword,
			});
			const data = unwrapData<{ token?: string }>(result);
			if (!data?.token) throw new Error("توکن مدیر برگردانده نشد.");
			localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
			setAdminToken(data.token);
			setAdminPassword("");
			setStatusMessage("نشست مدیر متصل شد.");
		} catch (err) {
			setAuthError(resolveApiErrorMessage(err, "ورود مدیر ناموفق بود."));
		} finally {
			setIsAuthLoading(false);
		}
	};

	const logoutAdmin = () => {
		localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
		setAdminToken("");
		setCatalogGames([]);
		setSelectedGameId("");
		setManualGameId("");
		setSummaries([]);
		setDetail(null);
		setStreamState("idle");
		streamSeqRef.current = 0;
	};

	useEffect(() => {
		const storedToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
		if (storedToken) setAdminToken(storedToken);
	}, []);

	useEffect(() => {
		if (!api) return;
		void loadCatalog();
	}, [api, loadCatalog]);

	useEffect(() => {
		if (!api || !selectedGameId) return;
		streamSeqRef.current = 0;
		void loadSummaries(selectedGameId);
	}, [api, loadSummaries, selectedGameId]);

	useEffect(() => {
		if (!adminToken || !selectedGameId || !liveEnabled) {
			setStreamState("idle");
			return;
		}

		let cancelled = false;
		const controller = new AbortController();

		const run = async () => {
			setStreamState("connecting");
			try {
				const params = new URLSearchParams();
				if (streamSeqRef.current > 0)
					params.set("since", String(streamSeqRef.current));
				params.set("types", "TURN_ANALYTICS_RECORDED");
				const response = await fetch(
					`${BASE_URL}/api/games/${encodeURIComponent(selectedGameId)}/events/stream?${params.toString()}`,
					{
						headers: {
							Accept: "text/event-stream",
							Authorization: `Bearer ${adminToken}`,
						},
						signal: controller.signal,
					},
				);
				if (!response.ok || !response.body) {
					throw new Error(`SSE stream returned ${response.status}.`);
				}
				setStreamState("live");
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				while (!cancelled) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					let boundary = buffer.indexOf("\n\n");
					while (boundary !== -1) {
						const block = buffer.slice(0, boundary).trim();
						buffer = buffer.slice(boundary + 2);
						if (block) {
							const event = parseSseBlock(block);
							if (event) ingestAnalyticsEvent(event);
						}
						boundary = buffer.indexOf("\n\n");
					}
				}
			} catch (err) {
				if (!cancelled && !controller.signal.aborted) {
					setStreamState("error");
					setError(
						resolveApiErrorMessage(err, "جریان زنده آنالیتیکس در دسترس نیست."),
					);
				}
			}
		};

		void run();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [adminToken, ingestAnalyticsEvent, liveEnabled, selectedGameId]);

	return (
		<div dir="rtl" className="min-h-screen bg-[#070a0f] text-slate-100">
			<div className="mx-auto max-w-[1680px] px-4 py-5 md:px-7">
				<header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-xs text-emerald-300">
							<BarChart3 className="h-4 w-4" />
							آنالیتیکس مدیر
						</div>
						<h1 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">
							کنسول ریاضیات بازی
						</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
							<Badge
								variant="outline"
								className="border-slate-600 bg-slate-950/50 text-slate-200"
								dir="ltr"
							>
								{BASE_URL}
							</Badge>
							<Badge
								variant="outline"
								className="border-emerald-600/70 bg-emerald-950/30 text-emerald-100"
							>
								بازی <span dir="ltr">{selectedGameId || "انتخاب نشده"}</span>
							</Badge>
							<Badge
								variant="outline"
								className={
									streamState === "live"
										? "border-emerald-500/70 bg-emerald-950/40 text-emerald-100"
										: "border-slate-600 bg-slate-950/50 text-slate-300"
								}
							>
								<Radio className="h-3.5 w-3.5" />
								{streamStateLabel(streamState)}
							</Badge>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							asChild
							variant="outline"
							className="border-slate-600 bg-slate-950/30 text-slate-100"
						>
							<Link href="/configuration">
								<SlidersHorizontal className="h-4 w-4" />
								پیکربندی
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							className="border-cyan-600 bg-cyan-950/30 text-cyan-100"
						>
							<Link href="/monitoring">
								<Activity className="h-4 w-4" />
								مانیتورینگ
							</Link>
						</Button>
						<Button
							onClick={() => void loadCatalog()}
							disabled={!api || isCatalogLoading}
							className="bg-emerald-700 text-white hover:bg-emerald-600"
						>
							<RefreshCw
								className={`h-4 w-4 ${isCatalogLoading ? "animate-spin" : ""}`}
							/>
							به‌روزرسانی
						</Button>
					</div>
				</header>

				<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<MetricTile
						icon={<Database className="h-5 w-5" />}
						label="بازی‌های کاتالوگ"
						value={catalogGames.length}
						accent="bg-cyan-950/70 text-cyan-200"
					/>
					<MetricTile
						icon={<FileClock className="h-5 w-5" />}
						label="نوبت‌های ذخیره‌شده"
						value={summaries.length}
						accent="bg-emerald-950/70 text-emerald-200"
					/>
					<MetricTile
						icon={<ImageIcon className="h-5 w-5" />}
						label="نمودارها"
						value={detailPlots.length || selectedGame?.plotCount || 0}
						accent="bg-violet-950/70 text-violet-200"
					/>
					<MetricTile
						icon={<Gauge className="h-5 w-5" />}
						label="نوبت انتخاب‌شده"
						value={selectedTurn ?? "-"}
						accent="bg-amber-950/70 text-amber-200"
					/>
				</div>

				{error ? (
					<div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 text-sm text-rose-100">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{error}</span>
					</div>
				) : null}

				{statusMessage ? (
					<div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-100">
						<CheckCircle2 className="h-4 w-4" />
						<span>{statusMessage}</span>
					</div>
				) : null}

				<div className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
					<div className="space-y-4">
						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-slate-100">
									<ShieldCheck className="h-4 w-4 text-emerald-300" />
									نشست مدیر
								</CardTitle>
							</CardHeader>
							<CardContent>
								{adminToken ? (
									<div className="space-y-3">
										<div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 text-sm text-emerald-100">
											متصل
										</div>
										<Button
											variant="outline"
											onClick={logoutAdmin}
											className="w-full border-slate-600 bg-slate-950/30 text-slate-100"
										>
											<LogOut className="h-4 w-4" />
											خروج
										</Button>
									</div>
								) : (
									<div className="space-y-3">
										<div className="space-y-2">
											<Label>رمز مدیر</Label>
											<Input
												type="password"
												value={adminPassword}
												onChange={(event) =>
													setAdminPassword(event.target.value)
												}
												className="border-slate-700 bg-slate-900 text-slate-100"
											/>
										</div>
										<Button
											onClick={() => void loginAdmin()}
											disabled={isAuthLoading || !adminPassword.trim()}
											className="w-full bg-emerald-700 text-white hover:bg-emerald-600"
										>
											<Zap className="h-4 w-4" />
											{isAuthLoading ? "در حال اتصال..." : "ورود"}
										</Button>
										{authError ? (
											<div className="text-sm text-rose-300">{authError}</div>
										) : null}
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-slate-100">
									<Database className="h-4 w-4 text-cyan-300" />
									کاتالوگ بازی
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>بازی کاتالوگ</Label>
									<Select
										value={selectedGameId || undefined}
										onValueChange={(value) => {
											setSelectedGameId(value);
											setManualGameId(value);
											setSelectedTurn(null);
										}}
									>
										<SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
											<SelectValue placeholder="انتخاب بازی" />
										</SelectTrigger>
										<SelectContent>
											{catalogGames.map((game) => (
												<SelectItem key={game.gameId} value={game.gameId}>
													{game.gameId}
													{game.isActive ? " / فعال" : ""}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>شناسه دستی بازی</Label>
									<div className="flex gap-2">
										<Input
											value={manualGameId}
											onChange={(event) => setManualGameId(event.target.value)}
											className="border-slate-700 bg-slate-900 font-mono text-slate-100"
											dir="ltr"
										/>
										<Button
											variant="outline"
											disabled={!manualGameId.trim()}
											onClick={() => {
												setSelectedTurn(null);
												setSelectedGameId(manualGameId.trim());
											}}
											className="border-slate-600 bg-slate-950/30 text-slate-100"
										>
											بارگذاری
										</Button>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
									<div>
										<div className="text-sm font-semibold text-slate-100">
											جریان زنده آنالیتیکس
										</div>
										<div
											className="mt-1 font-mono text-xs text-slate-500"
											dir="ltr"
										>
											{lastEvent ? `seq ${lastEvent.seq}` : "ready"}
										</div>
									</div>
									<Checkbox
										checked={liveEnabled}
										onCheckedChange={(value) => setLiveEnabled(Boolean(value))}
									/>
								</div>
								<div className="space-y-2">
									<Label>حداکثر خلاصه‌ها</Label>
									<Input
										type="number"
										min={1}
										max={500}
										value={summaryLimit}
										onChange={(event) =>
											setSummaryLimit(
												Math.max(1, Number(event.target.value) || 1),
											)
										}
										className="border-slate-700 bg-slate-900 text-slate-100"
									/>
								</div>
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-slate-100">
									<Clock className="h-4 w-4 text-amber-300" />
									گزارش‌های نوبت
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="mb-3 flex items-center gap-2">
									<Button
										variant="outline"
										disabled={!api || !selectedGameId || isSummariesLoading}
										onClick={() => void refreshSelectedGame()}
										className="border-slate-600 bg-slate-950/30 text-slate-100"
									>
										<RefreshCw
											className={`h-4 w-4 ${isSummariesLoading ? "animate-spin" : ""}`}
										/>
										به‌روزرسانی
									</Button>
								</div>
								<ScrollArea className="h-[420px] pr-3">
									<div className="space-y-2">
										{summaries.map((summary) => {
											const active = selectedTurn === summary.turn;
											return (
												<button
													key={summary.turn}
													type="button"
													onClick={() =>
														void loadTurnDetail(selectedGameId, summary.turn)
													}
													className={`w-full rounded-lg border p-3 text-right transition ${
														active
															? "border-emerald-400/70 bg-emerald-950/30"
															: "border-slate-800 bg-slate-900/60 hover:border-slate-600"
													}`}
												>
													<div className="flex items-center justify-between gap-3">
														<div className="font-mono text-lg font-black text-slate-50">
															نوبت {summary.turn}
														</div>
														<Badge
															variant="outline"
															className="border-slate-600 text-slate-200"
														>
															{summary.plotCount ?? 0} نمودار
														</Badge>
													</div>
													<div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
														<span>{summary.actionCount ?? 0} عملیات</span>
														<span>{summary.comparisonCount ?? 0} بررسی</span>
														<span>{summary.teamCount ?? 0} تیم</span>
													</div>
													<div className="mt-2 text-xs text-slate-500">
														{formatTimestamp(summary.createdAt)}
													</div>
												</button>
											);
										})}
										{summaries.length === 0 ? (
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
												گزارشی ذخیره نشده است.
											</div>
										) : null}
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base text-slate-100">
									<span className="flex items-center gap-2">
										<Calculator className="h-4 w-4 text-emerald-300" />
										جزئیات تحلیل نوبت
									</span>
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant="outline"
											className="border-slate-600 text-slate-200"
										>
											آخرین نوبت {latestSummary?.turn ?? "-"}
										</Badge>
										<Button
											size="sm"
											variant="outline"
											disabled={
												!selectedGameId ||
												selectedTurn === null ||
												isDetailLoading
											}
											onClick={() => {
												if (selectedTurn !== null)
													void loadTurnDetail(selectedGameId, selectedTurn);
											}}
											className="border-slate-600 bg-slate-950/30 text-slate-100"
										>
											<RefreshCw
												className={`h-4 w-4 ${isDetailLoading ? "animate-spin" : ""}`}
											/>
											بارگذاری دوباره
										</Button>
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{detail ? (
									<div className="space-y-5">
										<TurnTrendGraph
											summaries={summaries}
											selectedTurn={selectedTurn}
											onSelectTurn={(turn) => {
												if (selectedGameId)
													void loadTurnDetail(selectedGameId, turn);
											}}
										/>
										<div className="grid gap-3 md:grid-cols-4">
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
												<div className="text-xs text-slate-500">بازی</div>
												<div
													className="mt-2 truncate font-mono text-sm text-slate-100"
													dir="ltr"
												>
													{detail.gameId}
												</div>
											</div>
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
												<div className="text-xs text-slate-500">نوبت</div>
												<div className="mt-2 font-mono text-sm text-slate-100">
													{detail.turn}
												</div>
											</div>
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
												<div className="text-xs text-slate-500">زمان ایجاد</div>
												<div className="mt-2 text-sm text-slate-100">
													{formatTimestamp(detail.createdAt)}
												</div>
											</div>
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
												<div className="text-xs text-slate-500">نمودارها</div>
												<div className="mt-2 font-mono text-sm text-slate-100">
													{detailPlots.length}
												</div>
											</div>
										</div>

										<Tabs defaultValue="math" className="w-full">
											<TabsList className="flex h-auto w-full flex-wrap justify-start border border-slate-800 bg-slate-900/70">
												<TabsTrigger value="math">ریاضی</TabsTrigger>
												<TabsTrigger value="flow">جریان</TabsTrigger>
												<TabsTrigger value="comparison">مقایسه</TabsTrigger>
												<TabsTrigger value="plots">نمودارها</TabsTrigger>
												<TabsTrigger value="state">وضعیت</TabsTrigger>
											</TabsList>

											<TabsContent value="math" className="mt-4">
												<div className="grid gap-3 lg:grid-cols-2">
													{detailTeams.map(([teamName, values]) => (
														<div
															key={teamName}
															className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
														>
															<div className="flex items-start justify-between gap-3">
																<div>
																	<div className="font-semibold text-slate-50">
																		{teamName}
																	</div>
																	<div className="mt-1 text-xs text-slate-400">
																		بهترین هدف:{" "}
																		{getString(values, "best_target") ??
																			getString(values, "bestTarget") ??
																			"-"}
																	</div>
																</div>
																<Target className="h-4 w-4 text-emerald-300" />
															</div>
															<div className="mt-4 grid grid-cols-3 gap-2 text-xs">
																<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
																	<div className="text-slate-500">EV</div>
																	<div className="mt-1 font-mono text-slate-100">
																		{formatNumber(
																			values.expected_value ??
																				values.expectedValue,
																		)}
																	</div>
																</div>
																<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
																	<div className="text-slate-500">SAS</div>
																	<div className="mt-1 font-mono text-slate-100">
																		{formatNumber(values.sas)}
																	</div>
																</div>
																<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
																	<div className="text-slate-500">پیشرفت</div>
																	<div className="mt-1 font-mono text-slate-100">
																		{formatNumber(
																			values.points_progress ??
																				values.pointsProgress,
																		)}
																	</div>
																</div>
															</div>
														</div>
													))}
													{detailTeams.length === 0 ? (
														<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
															بخش ریاضی در این گزارش وجود ندارد.
														</div>
													) : null}
												</div>
											</TabsContent>

											<TabsContent value="flow" className="mt-4">
												<div className="space-y-3">
													{detailActions.map((action, index) => (
														<div
															key={`${getString(action, "teamName") ?? "team"}-${index}`}
															className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
														>
															<div className="flex flex-wrap items-center justify-between gap-3">
																<div className="font-semibold text-slate-50">
																	#{getNumber(action, "order") ?? index + 1}{" "}
																	{getString(action, "teamName") ?? "-"}
																</div>
																<Badge
																	variant="outline"
																	className={
																		getBoolean(action, "successful")
																			? "border-emerald-500/60 text-emerald-100"
																			: "border-rose-500/60 text-rose-100"
																	}
																>
																	{getBoolean(action, "successful")
																		? "موفق"
																		: "ناموفق"}
																</Badge>
															</div>
															<div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-4">
																<div>
																	عملیات:{" "}
																	{getString(action, "actionName") ??
																		getString(action, "name") ??
																		"-"}
																</div>
																<div>
																	دسته:{" "}
																	{getString(action, "actionCategory") ??
																		getString(action, "category") ??
																		"-"}
																</div>
																<div>
																	هدف:{" "}
																	{getString(action, "targetTeamName") ?? "-"}
																</div>
																<div>
																	اعتبار: {formatNumber(action.creditsSpent)} /{" "}
																	{formatNumber(action.creditsRemaining)}
																</div>
															</div>
														</div>
													))}
													{detailActions.length === 0 ? (
														<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
															عملیاتی در جریان این نوبت ثبت نشده است.
														</div>
													) : null}
												</div>
											</TabsContent>

											<TabsContent value="comparison" className="mt-4">
												<div className="grid gap-3 lg:grid-cols-2">
													{detailComparisons.map((row, index) => {
														const actual = asRecord(row.actualAction);
														const predicted = asRecord(row.predicted);
														const actualStrategy = asRecord(
															predicted?.actualStrategy,
														);
														return (
															<div
																key={`${getString(row, "teamName") ?? "team"}-${index}`}
																className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
															>
																<div className="flex items-start justify-between gap-3">
																	<div>
																		<div className="font-semibold text-slate-50">
																			{getString(row, "teamName") ?? "-"}
																		</div>
																		<div className="mt-1 text-xs text-slate-400">
																			هدف پیشنهادی:{" "}
																			{getString(
																				predicted,
																				"bestTargetTeamName",
																			) ?? "-"}
																		</div>
																	</div>
																	<Badge
																		variant="outline"
																		className={
																			getBoolean(
																				actualStrategy,
																				"matchedBestTarget",
																			)
																				? "border-emerald-500/60 text-emerald-100"
																				: "border-amber-500/60 text-amber-100"
																		}
																	>
																		{getBoolean(
																			actualStrategy,
																			"matchedBestTarget",
																		)
																			? "مطابق"
																			: "متفاوت"}
																	</Badge>
																</div>
																<div className="mt-4 grid gap-2 text-sm text-slate-300">
																	<div>
																		واقعی: {getString(actual, "name") ?? "-"} به{" "}
																		{getString(actual, "targetTeamName") ?? "-"}
																	</div>
																	<div>
																		پیشنهادی:{" "}
																		{getString(
																			asRecord(predicted?.recommendedStrategy),
																			"name",
																		) ?? "-"}
																	</div>
																	<div>
																		اختلاف EV:{" "}
																		{formatNumber(
																			actualStrategy?.expectedValueGapToRecommended,
																		)}
																	</div>
																	<div>
																		بهترین SAS:{" "}
																		{formatNumber(predicted?.bestSas)}
																	</div>
																</div>
															</div>
														);
													})}
													{detailComparisons.length === 0 ? (
														<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
															ردیف مقایسه‌ای برای این نوبت وجود ندارد.
														</div>
													) : null}
												</div>
											</TabsContent>

											<TabsContent value="plots" className="mt-4">
												<div className="grid gap-3 lg:grid-cols-2">
													{detailPlots.map((plot, index) => (
														<div
															key={`${plot.fileName ?? plot.accessUrl ?? "plot"}-${index}`}
															className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60"
														>
															<div className="flex items-center justify-between gap-3 border-b border-slate-800 p-3">
																<div className="min-w-0">
																	<div className="truncate font-semibold text-slate-50">
																		{plot.teamName ?? "تیم"} به{" "}
																		{plot.targetTeamName ?? "هدف"}
																	</div>
																	<div
																		className="mt-1 truncate text-xs text-slate-500"
																		dir="ltr"
																	>
																		{plot.fileName ??
																			plot.storage?.objectKey ??
																			"plot"}
																	</div>
																</div>
																{plot.accessUrl ? (
																	<Button
																		asChild
																		size="sm"
																		variant="outline"
																		className="border-slate-600 bg-slate-950/30 text-slate-100"
																	>
																		<a
																			href={plot.accessUrl}
																			target="_blank"
																			rel="noreferrer"
																		>
																			<Link2 className="h-4 w-4" />
																		</a>
																	</Button>
																) : null}
															</div>
															{plot.accessUrl ? (
																<Image
																	src={plot.accessUrl}
																	alt={`نمودار آنالیتیکس ${plot.teamName ?? "تیم"}`}
																	width={960}
																	height={540}
																	unoptimized
																	className="aspect-video w-full bg-slate-950 object-contain"
																/>
															) : (
																<div className="flex aspect-video items-center justify-center bg-slate-950 text-sm text-slate-500">
																	آدرس دسترسی وجود ندارد
																</div>
															)}
															<div className="flex items-center justify-between gap-2 p-3 text-xs text-slate-400">
																<span>
																	انقضا{" "}
																	{formatTimestamp(plot.accessUrlExpiresAt)}
																</span>
																{plotIsExpired(plot) ? (
																	<Badge
																		variant="outline"
																		className="border-amber-500/60 text-amber-100"
																	>
																		نیازمند به‌روزرسانی
																	</Badge>
																) : null}
															</div>
														</div>
													))}
													{detailPlots.length === 0 ? (
														<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
															نمودار ذخیره‌شده‌ای وجود ندارد.
														</div>
													) : null}
												</div>
											</TabsContent>

											<TabsContent value="state" className="mt-4">
												<div className="grid gap-3 xl:grid-cols-2">
													<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
														<div className="mb-3 font-semibold text-slate-50">
															وضعیت نوبت
														</div>
														<pre
															className="max-h-[520px] overflow-auto rounded-md bg-slate-950 p-3 text-left text-xs text-slate-300"
															dir="ltr"
														>
															{safeJson(detail.turnState)}
														</pre>
													</div>
													<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
														<div className="mb-3 font-semibold text-slate-50">
															گزارش خام
														</div>
														<pre
															className="max-h-[520px] overflow-auto rounded-md bg-slate-950 p-3 text-left text-xs text-slate-300"
															dir="ltr"
														>
															{safeJson(detail)}
														</pre>
													</div>
												</div>
											</TabsContent>
										</Tabs>
									</div>
								) : (
									<div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center text-sm text-slate-400">
										یک بازی و گزارش نوبت را انتخاب کنید.
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-slate-100">
									<BarChart3 className="h-4 w-4 text-cyan-300" />
									نمای کاتالوگ آنالیتیکس
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
									{catalogGames.map((game) => (
										<button
											key={game.gameId}
											type="button"
											onClick={() => {
												setSelectedGameId(game.gameId);
												setManualGameId(game.gameId);
												setSelectedTurn(null);
											}}
											className={`rounded-lg border p-4 text-right transition ${
												game.gameId === selectedGameId
													? "border-emerald-400/70 bg-emerald-950/20"
													: "border-slate-800 bg-slate-900/60 hover:border-slate-600"
											}`}
										>
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div
														className="truncate font-mono text-sm font-semibold text-slate-50"
														dir="ltr"
													>
														{game.gameId}
													</div>
													<div className="mt-1 text-xs text-slate-500">
														{formatTimestamp(game.createdAt)}
													</div>
												</div>
												{game.gameId === activeGameId || game.isActive ? (
													<Badge
														variant="outline"
														className="border-emerald-500/60 text-emerald-100"
													>
														فعال
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="border-slate-600 text-slate-300"
													>
														{game.status ?? "ذخیره‌شده"}
													</Badge>
												)}
											</div>
											<div className="mt-4 grid grid-cols-3 gap-2 text-xs">
												<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
													<div className="text-slate-500">نوبت</div>
													<div className="mt-1 font-mono text-slate-100">
														{game.currentTurn ?? "-"} / {game.totalTurns ?? "-"}
													</div>
												</div>
												<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
													<div className="text-slate-500">گزارش‌ها</div>
													<div className="mt-1 font-mono text-slate-100">
														{game.turnAnalyticsCount ?? 0}
													</div>
												</div>
												<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
													<div className="text-slate-500">نمودارها</div>
													<div className="mt-1 font-mono text-slate-100">
														{game.plotCount ?? 0}
													</div>
												</div>
											</div>
											<div className="mt-3 flex flex-wrap gap-1">
												{game.sides?.map((side) => (
													<Badge
														key={side}
														variant="outline"
														className="border-slate-700 text-slate-300"
													>
														{side}
													</Badge>
												))}
											</div>
										</button>
									))}
									{catalogGames.length === 0 ? (
										<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
											هنوز بازی‌ای از کاتالوگ بارگذاری نشده است.
										</div>
									) : null}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
