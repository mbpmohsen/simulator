"use client";

import { createGameServerApi, type DirectiveConfig } from "@workspace/trpc";
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
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	Activity,
	AlertTriangle,
	Ban,
	BarChart3,
	Bell,
	BookOpen,
	CheckCircle2,
	Eye,
	FileClock,
	Filter,
	Gauge,
	GitBranch,
	History,
	LayoutDashboard,
	Lock,
	LogOut,
	Pause,
	Play,
	Radio,
	RefreshCw,
	RotateCcw,
	Send,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Trash2,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE_URL =
	process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://game.darkube.ir";
const ADMIN_TOKEN_STORAGE_KEY = "simulator-admin-token";
const POLL_INTERVAL_MS = 6000;
const MAX_EVENTS = 160;

type Tone = "info" | "success" | "warning" | "danger" | "neutral";

interface MonitoringEvent {
	seq: number;
	gameId: string;
	type: string;
	phase?: string | null;
	visibility?: {
		scope?: string;
		teamId?: number | null;
		sideId?: number | null;
		userId?: number | null;
	};
	payload: Record<string, unknown>;
	createdAt?: string;
	schemaVersion?: number;
}

interface ReadinessTeamStatus {
	teamId: number;
	assignedCount: number;
	readyCount: number;
	presentCount: number;
	isReady: boolean;
	readyUserIds: number[];
	presentUserIds: number[];
}

interface ReadinessStatus {
	gameId: string;
	teams: ReadinessTeamStatus[];
	allTeamsReady: boolean;
	totalAssigned: number;
	totalPresent: number;
	message?: string | null;
}

interface EventStatus {
	gameId: string;
	currentSeq: number;
	eventCount: number;
	streamEndpoint: string;
	replayEndpoint: string;
}

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

const normalizeGameId = (value: unknown): string | null => {
	if (typeof value === "string" && value.trim()) return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
};

const formatDateTime = (value: string | undefined): string => {
	if (!value) return "در انتظار";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		day: "2-digit",
	}).format(date);
};

const eventTone = (type: string): Tone => {
	const upper = type.toUpperCase();
	if (
		upper.includes("REJECT") ||
		upper.includes("FAILED") ||
		upper.includes("DISCONNECTED")
	) {
		return "danger";
	}
	if (
		upper.includes("ALERT") ||
		upper.includes("BANNED") ||
		upper.includes("RESET")
	) {
		return "warning";
	}
	if (
		upper.includes("READY") ||
		upper.includes("STARTED") ||
		upper.includes("UPDATED")
	) {
		return "success";
	}
	if (
		upper.includes("VOTE") ||
		upper.includes("ATTACK") ||
		upper.includes("GOVERNMENT")
	) {
		return "info";
	}
	return "neutral";
};

const toneClass = (tone: Tone): string => {
	switch (tone) {
		case "danger":
			return "border-rose-500/50 bg-rose-950/30 text-rose-100";
		case "warning":
			return "border-amber-500/50 bg-amber-950/30 text-amber-100";
		case "success":
			return "border-emerald-500/50 bg-emerald-950/30 text-emerald-100";
		case "info":
			return "border-cyan-500/50 bg-cyan-950/30 text-cyan-100";
		default:
			return "border-slate-700 bg-slate-900/70 text-slate-200";
	}
};

const parseEvent = (
	value: unknown,
	fallbackType = "MESSAGE",
): MonitoringEvent | null => {
	const record = asRecord(value);
	if (!record) return null;
	const seq = getNumber(record, "seq") ?? getNumber(record, "id") ?? Date.now();
	const visibility = asRecord(record.visibility);
	return {
		seq,
		gameId: getString(record, "gameId") ?? getString(record, "game_id") ?? "",
		type: getString(record, "type") ?? fallbackType,
		phase: getString(record, "phase"),
		visibility: visibility
			? {
					scope: getString(visibility, "scope") ?? undefined,
					teamId: getNumber(visibility, "teamId"),
					sideId: getNumber(visibility, "sideId"),
					userId: getNumber(visibility, "userId"),
				}
			: undefined,
		payload: asRecord(record.payload) ?? record,
		createdAt:
			getString(record, "createdAt") ??
			getString(record, "created_at") ??
			undefined,
		schemaVersion: getNumber(record, "schemaVersion") ?? undefined,
	};
};

const parseSseData = (
	rawData: string,
	eventType: string,
): MonitoringEvent | null => {
	try {
		const parsed = JSON.parse(rawData) as unknown;
		return parseEvent(parsed, eventType);
	} catch {
		return {
			seq: Date.now(),
			gameId: "",
			type: eventType || "MESSAGE",
			payload: { message: rawData },
			createdAt: new Date().toISOString(),
		};
	}
};

const eventSummary = (event: MonitoringEvent): string => {
	const payload = event.payload;
	for (const key of [
		"message",
		"detail",
		"reason",
		"action",
		"actionName",
		"teamName",
	]) {
		const value = payload[key];
		if (typeof value === "string" && value.trim()) return value;
	}
	return JSON.stringify(payload).slice(0, 180);
};

const directiveFromRecord = (value: unknown): DirectiveConfig | null => {
	const record = asRecord(value);
	if (!record) return null;
	const name = getString(record, "name");
	const effectType = getString(record, "effect_type");
	const targetAction = getString(record, "target_action");
	const targetActionType = getString(record, "target_action_type");
	const startTurn = getNumber(record, "start_turn");
	const duration = getNumber(record, "duration");
	const directiveValue = getNumber(record, "value");
	if (
		!name ||
		!effectType ||
		!targetAction ||
		!targetActionType ||
		!startTurn ||
		!duration
	) {
		return null;
	}
	return {
		id: getNumber(record, "id"),
		name,
		effect_type: effectType,
		target_action: targetAction,
		target_action_type: targetActionType,
		value: directiveValue ?? 0,
		start_turn: startTurn,
		duration,
		modifier_type: getString(record, "modifier_type") ?? "increase",
		affected_sides: Array.isArray(record.affected_sides)
			? record.affected_sides.filter(
					(item): item is string => typeof item === "string",
				)
			: null,
		limit_type: getString(record, "limit_type"),
		limit_value: getNumber(record, "limit_value"),
	};
};

const extractDirectives = (
	response: unknown,
	key: "directives" | "activeDirectives",
): DirectiveConfig[] => {
	const data = unwrapData<Record<string, unknown>>(response);
	const collection = asArray(asRecord(data)?.[key]);
	return collection
		.map((item) => directiveFromRecord(item))
		.filter((item): item is DirectiveConfig => item !== null);
};

const extractEvents = (response: unknown): MonitoringEvent[] => {
	const data = unwrapData<Record<string, unknown>>(response);
	const collection = asArray(asRecord(data)?.events);
	return collection
		.map((item) => parseEvent(item))
		.filter((item): item is MonitoringEvent => item !== null);
};

export default function AdminMonitoringPage() {
	const [adminPassword, setAdminPassword] = useState("");
	const [adminToken, setAdminToken] = useState("");
	const [authError, setAuthError] = useState<string | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(false);

	const [gameState, setGameState] = useState<Record<string, unknown> | null>(
		null,
	);
	const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
	const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
	const [events, setEvents] = useState<MonitoringEvent[]>([]);
	const [directives, setDirectives] = useState<DirectiveConfig[]>([]);
	const [activeDirectives, setActiveDirectives] = useState<DirectiveConfig[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(false);
	const [controlMessage, setControlMessage] = useState<string | null>(null);
	const [controlError, setControlError] = useState<string | null>(null);

	const [autoRefresh, setAutoRefresh] = useState(true);
	const [streamConnected, setStreamConnected] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [eventTypeFilter, setEventTypeFilter] = useState("all");
	const [eventSearch, setEventSearch] = useState("");

	const [directiveName, setDirectiveName] = useState("ops_probability_shift");
	const [effectType, setEffectType] = useState("probability");
	const [targetAction, setTargetAction] = useState("all");
	const [targetActionType, setTargetActionType] = useState("both");
	const [modifierType, setModifierType] = useState("increase");
	const [directiveValue, setDirectiveValue] = useState("10");
	const [startTurn, setStartTurn] = useState("1");
	const [duration, setDuration] = useState("1");
	const [affectedSides, setAffectedSides] = useState("");
	const [limitType, setLimitType] = useState("");
	const [limitValue, setLimitValue] = useState("");

	const lastSeqRef = useRef(0);

	const api = useMemo(() => {
		if (!adminToken) return null;
		return createGameServerApi({ baseURL: BASE_URL, adminToken });
	}, [adminToken]);

	const game = asRecord(gameState?.game);
	const gameId = normalizeGameId(game?.gameId) ?? normalizeGameId(game?.id);
	const teams = asArray(gameState?.teams)
		.map((item) => asRecord(item))
		.filter(Boolean);
	const players = asArray(gameState?.players)
		.map((item) => asRecord(item))
		.filter(Boolean);
	const sides = asArray(gameState?.sides)
		.map((item) => asRecord(item))
		.filter(Boolean);
	const actions = asArray(gameState?.actions)
		.map((item) => asRecord(item))
		.filter(Boolean);
	const currentTurn = getNumber(game, "currentTurn") ?? 1;
	const totalTurns = getNumber(game, "totalTurns") ?? 0;
	const gameStatus = getString(game, "status") ?? "UNKNOWN";
	const currentPhase =
		getString(game, "currentPhase") ?? getString(game, "phase") ?? "waiting";
	const connectedPlayers = players.filter(
		(player) => getBoolean(player, "connected") === true,
	).length;
	const readinessPercent =
		readiness && readiness.totalAssigned > 0
			? Math.round((readiness.totalPresent / readiness.totalAssigned) * 100)
			: 0;

	const eventTypes = useMemo(() => {
		return Array.from(new Set(events.map((event) => event.type))).sort();
	}, [events]);

	const filteredEvents = useMemo(() => {
		const query = eventSearch.trim().toLowerCase();
		return events.filter((event) => {
			if (eventTypeFilter !== "all" && event.type !== eventTypeFilter)
				return false;
			if (!query) return true;
			return (
				event.type.toLowerCase().includes(query) ||
				eventSummary(event).toLowerCase().includes(query) ||
				(event.visibility?.scope ?? "").toLowerCase().includes(query)
			);
		});
	}, [eventSearch, eventTypeFilter, events]);

	const refreshAll = useCallback(
		async (background = false) => {
			if (!api) return;
			if (!background) setIsLoading(true);
			setControlError(null);
			try {
				const gameResponse = await api.getAdminGameState();
				const nextGameState = unwrapData<Record<string, unknown>>(gameResponse);
				setGameState(nextGameState);

				const nextGame = asRecord(nextGameState?.game);
				const nextGameId =
					normalizeGameId(nextGame?.gameId) ?? normalizeGameId(nextGame?.id);
				if (!nextGameId) return;

				const [
					readinessResult,
					statusResult,
					adminEventsResult,
					directivesResult,
					activeResult,
				] = await Promise.allSettled([
					api.getReadiness(nextGameId),
					api.getEventsStatus(nextGameId),
					api.getEventsAdminAll(nextGameId, { limit: MAX_EVENTS }),
					api.listDirectives(),
					api.getActiveDirectives(),
				]);

				if (readinessResult.status === "fulfilled") {
					setReadiness(unwrapData<ReadinessStatus>(readinessResult.value));
				}
				if (statusResult.status === "fulfilled") {
					setEventStatus(unwrapData<EventStatus>(statusResult.value));
				}
				if (adminEventsResult.status === "fulfilled") {
					const replayed = extractEvents(adminEventsResult.value);
					setEvents((previous) => {
						const merged = new Map<number, MonitoringEvent>();
						for (const event of [...replayed, ...previous]) {
							merged.set(event.seq, event);
						}
						const next = Array.from(merged.values()).sort(
							(a, b) => b.seq - a.seq,
						);
						lastSeqRef.current = Math.max(
							lastSeqRef.current,
							...next.map((event) => event.seq),
							0,
						);
						return next.slice(0, MAX_EVENTS);
					});
				}
				if (directivesResult.status === "fulfilled") {
					setDirectives(
						extractDirectives(directivesResult.value, "directives"),
					);
				}
				if (activeResult.status === "fulfilled") {
					setActiveDirectives(
						extractDirectives(activeResult.value, "activeDirectives"),
					);
				}
			} catch (error) {
				setControlError(
					resolveApiErrorMessage(error, "داده‌های مانیتورینگ به‌روزرسانی نشد."),
				);
			} finally {
				if (!background) setIsLoading(false);
			}
		},
		[api],
	);

	useEffect(() => {
		const storedToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
		if (storedToken) setAdminToken(storedToken);
	}, []);

	useEffect(() => {
		if (!api) return;
		void refreshAll();
	}, [api, refreshAll]);

	useEffect(() => {
		if (!api || !autoRefresh) return;
		const timer = setInterval(() => {
			void refreshAll(true);
		}, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [api, autoRefresh, refreshAll]);

	useEffect(() => {
		if (!api || !gameId || !autoRefresh) {
			setStreamConnected(false);
			return;
		}

		let cancelled = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let abortController: AbortController | null = null;

		const handleSseEvent = (
			eventType: string,
			rawData: string,
			eventId: string | null,
		) => {
			const parsed = parseSseData(rawData, eventType);
			if (!parsed) return;
			const eventIdSeq = eventId ? Number(eventId) : Number.NaN;
			const seq = Number.isFinite(eventIdSeq)
				? Math.max(parsed.seq, eventIdSeq)
				: parsed.seq;
			const event = {
				...parsed,
				seq,
				type: parsed.type || eventType || "MESSAGE",
			};
			lastSeqRef.current = Math.max(lastSeqRef.current, seq);
			setEvents((previous) => {
				if (
					previous.some(
						(item) => item.seq === event.seq && item.type === event.type,
					)
				) {
					return previous;
				}
				return [event, ...previous].slice(0, MAX_EVENTS);
			});
		};

		const connect = async () => {
			if (cancelled) return;
			try {
				abortController = new AbortController();
				const response = await api.openEventsStream(
					gameId,
					lastSeqRef.current > 0 ? { since: lastSeqRef.current } : undefined,
					{
						headers: { "Cache-Control": "no-cache" },
						signal: abortController.signal,
					},
				);

				if (!response.ok || !response.body) {
					throw new Error(`SSE stream failed with ${response.status}`);
				}

				setStreamConnected(true);
				setStreamError(null);

				const reader = response.body.getReader();
				const decoder = new TextDecoder("utf-8");
				let buffer = "";
				let eventType = "message";
				let eventId: string | null = null;
				let dataLines: string[] = [];

				const dispatchCurrentEvent = () => {
					if (dataLines.length === 0) return;
					handleSseEvent(eventType, dataLines.join("\n"), eventId);
					eventType = "message";
					eventId = null;
					dataLines = [];
				};

				while (!cancelled) {
					const { value, done } = await reader.read();
					if (done) {
						dispatchCurrentEvent();
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split(/\r?\n/);
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						if (!line) {
							dispatchCurrentEvent();
							continue;
						}
						if (line.startsWith(":")) continue;
						const separatorIndex = line.indexOf(":");
						const field =
							separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
						const rawValue =
							separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";
						const fieldValue = rawValue.startsWith(" ")
							? rawValue.slice(1)
							: rawValue;
						if (field === "event") eventType = fieldValue || "message";
						if (field === "id") eventId = fieldValue;
						if (field === "data") dataLines.push(fieldValue);
					}
				}
			} catch (error) {
				if (cancelled) return;
				setStreamConnected(false);
				setStreamError(resolveApiErrorMessage(error, "جریان زنده قطع شد."));
				reconnectTimer = setTimeout(connect, 3000);
			}
		};

		void connect();

		return () => {
			cancelled = true;
			setStreamConnected(false);
			if (reconnectTimer) clearTimeout(reconnectTimer);
			abortController?.abort();
		};
	}, [api, autoRefresh, gameId]);

	const loginAdmin = async () => {
		setAuthError(null);
		setIsAuthLoading(true);
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
		} catch (error) {
			setAuthError(resolveApiErrorMessage(error, "ورود مدیر ناموفق بود."));
		} finally {
			setIsAuthLoading(false);
		}
	};

	const logoutAdmin = () => {
		localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
		setAdminToken("");
		setGameState(null);
		setReadiness(null);
		setEventStatus(null);
		setEvents([]);
		setDirectives([]);
		setActiveDirectives([]);
		setStreamConnected(false);
	};

	const runControl = async (
		operation: () => Promise<unknown>,
		successMessage: string,
	) => {
		setControlError(null);
		setControlMessage(null);
		try {
			await operation();
			setControlMessage(successMessage);
			await refreshAll();
		} catch (error) {
			setControlError(
				resolveApiErrorMessage(error, "اجرای دستور کنترلی ناموفق بود."),
			);
		}
	};

	const addDirective = async () => {
		if (!api) return;
		const nextStartTurn = Number(startTurn);
		const nextDuration = Number(duration);
		const nextValue = Number(directiveValue);
		if (
			!directiveName.trim() ||
			!Number.isFinite(nextStartTurn) ||
			!Number.isFinite(nextDuration)
		) {
			setControlError("نام دستور، نوبت شروع و مدت الزامی هستند.");
			return;
		}
		const directive: DirectiveConfig = {
			name: directiveName.trim(),
			effect_type: effectType,
			target_action: targetAction.trim() || "all",
			target_action_type: targetActionType,
			value: Number.isFinite(nextValue) ? nextValue : 0,
			start_turn: nextStartTurn,
			duration: nextDuration,
			modifier_type: modifierType,
			affected_sides: affectedSides
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean),
			limit_type: limitType.trim() || null,
			limit_value: limitValue.trim() ? Number(limitValue) : null,
		};

		await runControl(
			() => api.addDirectives({ directives: [directive] }),
			`دستور "${directive.name}" اضافه شد.`,
		);
	};

	const readinessByTeam = useMemo(() => {
		const map = new Map<number, ReadinessTeamStatus>();
		for (const team of readiness?.teams ?? []) {
			map.set(team.teamId, team);
		}
		return map;
	}, [readiness]);

	const pointThreshold = getNumber(game, "pointThreshold") ?? 0;

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_14%_10%,rgba(8,145,178,0.24),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(190,18,60,0.18),transparent_30%),linear-gradient(145deg,#05070a_0%,#111827_44%,#06080d_100%)] text-slate-100">
			<div className="mx-auto max-w-[1680px] px-4 py-5 md:px-7">
				<header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-xs text-cyan-300">
							<LayoutDashboard className="h-4 w-4" />
							مانیتورینگ مدیر
						</div>
						<h1 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">
							کنسول عملیات بازی
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
								className="border-cyan-600/70 bg-cyan-950/30 text-cyan-100"
							>
								بازی <span dir="ltr">{gameId ?? "پیکربندی نشده"}</span>
							</Badge>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							asChild
							variant="outline"
							className="border-slate-600 bg-slate-950/30 text-slate-100"
						>
							<Link href="/admin/game-plan">
								<SlidersHorizontal className="h-4 w-4" />
								پیکربندی
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							className="border-violet-600 bg-violet-950/30 text-violet-100"
						>
							<Link href="/admin/current-flow">
								<GitBranch className="h-4 w-4" />
								نقشه فعلی
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							className="border-slate-600 bg-slate-950/30 text-slate-100"
						>
							<Link href="/docs">
								<BookOpen className="h-4 w-4" /> راهنما
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							className="border-emerald-600 bg-emerald-950/30 text-emerald-100"
						>
							<Link href="/analytics">
								<BarChart3 className="h-4 w-4" />
								آنالیتیکس
							</Link>
						</Button>
						<Button
							onClick={() => void refreshAll()}
							disabled={!api || isLoading}
							className="bg-cyan-700 text-white hover:bg-cyan-600"
						>
							<RefreshCw
								className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
							/>
							به‌روزرسانی
						</Button>
					</div>
				</header>

				<section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
					<div className="rounded-lg border border-slate-800 bg-slate-950/65 p-3">
						<div className="flex items-center gap-2 text-xs text-slate-400">
							<Gauge className="h-4 w-4 text-cyan-300" />
							وضعیت
						</div>
						<div className="mt-2 text-xl font-semibold">{gameStatus}</div>
						<div className="mt-1 text-xs text-slate-400">{currentPhase}</div>
					</div>
					<div className="rounded-lg border border-slate-800 bg-slate-950/65 p-3">
						<div className="flex items-center gap-2 text-xs text-slate-400">
							<FileClock className="h-4 w-4 text-amber-300" />
							نوبت
						</div>
						<div className="mt-2 text-xl font-semibold">
							{currentTurn} / {totalTurns || "-"}
						</div>
						<div className="mt-1 text-xs text-slate-400">
							آستانه {pointThreshold || "-"}
						</div>
					</div>
					<div className="rounded-lg border border-slate-800 bg-slate-950/65 p-3">
						<div className="flex items-center gap-2 text-xs text-slate-400">
							<Users className="h-4 w-4 text-emerald-300" />
							آمادگی
						</div>
						<div className="mt-2 text-xl font-semibold">
							{readiness?.totalPresent ?? connectedPlayers} /{" "}
							{readiness?.totalAssigned ?? players.length}
						</div>
						<Progress value={readinessPercent} className="mt-2 bg-slate-800" />
					</div>
					<div className="rounded-lg border border-slate-800 bg-slate-950/65 p-3">
						<div className="flex items-center gap-2 text-xs text-slate-400">
							<Radio
								className={
									streamConnected
										? "h-4 w-4 text-emerald-300"
										: "h-4 w-4 text-amber-300"
								}
							/>
							جریان زنده
						</div>
						<div className="mt-2 text-xl font-semibold">
							{streamConnected ? "متصل" : "در انتظار"}
						</div>
						<div className="mt-1 text-xs text-slate-400" dir="ltr">
							Seq {eventStatus?.currentSeq ?? lastSeqRef.current}
						</div>
					</div>
					<div className="rounded-lg border border-slate-800 bg-slate-950/65 p-3">
						<div className="flex items-center gap-2 text-xs text-slate-400">
							<Activity className="h-4 w-4 text-violet-300" />
							فعالیت
						</div>
						<div className="mt-2 text-xl font-semibold">
							{eventStatus?.eventCount ?? events.length}
						</div>
						<div className="mt-1 text-xs text-slate-400">
							{activeDirectives.length} دستور فعال
						</div>
					</div>
				</section>

				{controlError ? (
					<div className="mt-4 rounded-lg border border-rose-500/45 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4" />
							{controlError}
						</div>
					</div>
				) : null}
				{streamError ? (
					<div className="mt-4 rounded-lg border border-amber-500/45 bg-amber-950/35 px-4 py-3 text-sm text-amber-100">
						<div className="flex items-center gap-2">
							<Bell className="h-4 w-4" />
							{streamError}
						</div>
					</div>
				) : null}
				{controlMessage ? (
					<div className="mt-4 rounded-lg border border-emerald-500/45 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4" />
							{controlMessage}
						</div>
					</div>
				) : null}

				<main className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
					<div className="space-y-5">
						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader className="pb-3">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<CardTitle className="flex items-center gap-2 text-base text-cyan-100">
										<History className="h-4 w-4" />
										جریان رویدادها
									</CardTitle>
									<div className="flex flex-wrap items-center gap-2">
										<div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs">
											<Checkbox
												checked={autoRefresh}
												onCheckedChange={(checked) =>
													setAutoRefresh(checked === true)
												}
											/>
											<span>زنده</span>
										</div>
										<Select
											value={eventTypeFilter}
											onValueChange={setEventTypeFilter}
										>
											<SelectTrigger className="w-[180px] border-slate-700 bg-slate-900/80 text-slate-100">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
												<SelectItem value="all">همه نوع‌های رویداد</SelectItem>
												{eventTypes.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<div className="relative">
											<Filter className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
											<Input
												value={eventSearch}
												onChange={(event) => setEventSearch(event.target.value)}
												placeholder="فیلتر رویدادها"
												className="w-[210px] border-slate-700 bg-slate-900/80 pl-9 text-slate-100"
											/>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ScrollArea className="h-[520px] pr-3">
									<div className="space-y-2">
										{filteredEvents.length === 0 ? (
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
												رویدادی در دسترس نیست.
											</div>
										) : null}
										{filteredEvents.map((event) => {
											const tone = eventTone(event.type);
											return (
												<div
													key={`${event.seq}-${event.type}`}
													className={`rounded-lg border p-3 ${toneClass(tone)}`}
												>
													<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
														<div className="min-w-0">
															<div className="flex flex-wrap items-center gap-2">
																<Badge
																	variant="outline"
																	className="border-current bg-black/20 text-current"
																>
																	#{event.seq}
																</Badge>
																<div
																	className="font-mono text-sm font-semibold"
																	dir="ltr"
																>
																	{event.type}
																</div>
																{event.visibility?.scope ? (
																	<Badge
																		variant="outline"
																		className="border-slate-600 bg-slate-950/40 text-slate-200"
																	>
																		{event.visibility.scope}
																	</Badge>
																) : null}
															</div>
															<div className="mt-2 text-sm text-slate-200/90">
																{eventSummary(event)}
															</div>
														</div>
														<div
															className="shrink-0 text-left font-mono text-xs text-slate-400"
															dir="ltr"
														>
															{formatDateTime(event.createdAt)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</ScrollArea>
							</CardContent>
						</Card>

						<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
							<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base text-emerald-100">
										<Users className="h-4 w-4" />
										تیم‌ها و آمادگی
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{teams.map((team) => {
											const id = getNumber(team, "id");
											const readinessTeam =
												id !== null ? readinessByTeam.get(id) : null;
											const points = getNumber(team, "points") ?? 0;
											const credits = getNumber(team, "credits") ?? 0;
											const sideId = getNumber(team, "sideId");
											const side = sides.find(
												(item) => getNumber(item, "id") === sideId,
											);
											return (
												<div
													key={id ?? getString(team, "name") ?? Math.random()}
													className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<div className="font-semibold text-slate-100">
																{getString(team, "name") ?? "تیم بی‌نام"}
															</div>
															<div className="mt-1 text-xs text-slate-400">
																{getString(team, "role") ?? "نقش نامشخص"} /{" "}
																{getString(side ?? null, "name") ??
																	"سمت نامشخص"}
															</div>
														</div>
														<Badge
															variant="outline"
															className={
																readinessTeam?.isReady
																	? "border-emerald-500/70 bg-emerald-950/40 text-emerald-100"
																	: "border-amber-500/70 bg-amber-950/40 text-amber-100"
															}
														>
															{readinessTeam?.isReady ? "آماده" : "در انتظار"}
														</Badge>
													</div>
													<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
														<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
															<div className="text-slate-500">امتیاز</div>
															<div className="mt-1 font-mono text-slate-100">
																{points}
															</div>
														</div>
														<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
															<div className="text-slate-500">اعتبار</div>
															<div className="mt-1 font-mono text-slate-100">
																{credits}
															</div>
														</div>
														<div className="rounded border border-slate-800 bg-slate-950/60 p-2">
															<div className="text-slate-500">حاضر</div>
															<div className="mt-1 font-mono text-slate-100">
																{readinessTeam?.presentCount ?? 0} /{" "}
																{readinessTeam?.assignedCount ?? 0}
															</div>
														</div>
													</div>
												</div>
											);
										})}
										{teams.length === 0 ? (
											<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
												تیمی پیکربندی نشده است.
											</div>
										) : null}
									</div>
								</CardContent>
							</Card>

							<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base text-violet-100">
										<Sparkles className="h-4 w-4" />
										دستورهای فعال
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div>
											<div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
												فعال
											</div>
											<div className="space-y-2">
												{activeDirectives.map((directive) => (
													<div
														key={`active-${directive.name}`}
														className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-3"
													>
														<div className="flex items-center justify-between gap-2">
															<div className="font-semibold text-violet-100">
																{directive.name}
															</div>
															<Badge
																variant="outline"
																className="border-violet-400/60 text-violet-100"
															>
																{directive.effect_type}
															</Badge>
														</div>
														<div className="mt-1 text-xs text-slate-400">
															{directive.modifier_type ?? "increase"}{" "}
															{directive.value} / {directive.target_action}
														</div>
													</div>
												))}
												{activeDirectives.length === 0 ? (
													<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
														دستور فعالی وجود ندارد.
													</div>
												) : null}
											</div>
										</div>
										<div>
											<div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
												پیکربندی‌شده
											</div>
											<ScrollArea className="h-[250px] pr-3">
												<div className="space-y-2">
													{directives.map((directive) => (
														<div
															key={directive.name}
															className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
														>
															<div className="min-w-0">
																<div className="truncate font-semibold text-slate-100">
																	{directive.name}
																</div>
																<div className="mt-1 text-xs text-slate-400">
																	نوبت {directive.start_turn} /{" "}
																	{directive.duration} نوبت /{" "}
																	{directive.effect_type}
																</div>
															</div>
															<Button
																size="sm"
																variant="outline"
																className="border-rose-500/60 text-rose-100 hover:bg-rose-950/30"
																onClick={() => {
																	if (!api) return;
																	void runControl(
																		() => api.deleteDirective(directive.name),
																		`دستور "${directive.name}" حذف شد.`,
																	);
																}}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													))}
													{directives.length === 0 ? (
														<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
															دستوری پیکربندی نشده است.
														</div>
													) : null}
												</div>
											</ScrollArea>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<aside className="space-y-5">
						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-cyan-100">
									<Lock className="h-4 w-4" />
									نشست مدیر
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{adminToken ? (
									<div className="space-y-3">
										<div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 p-3 text-sm text-emerald-100">
											<div className="flex items-center gap-2">
												<ShieldCheck className="h-4 w-4" />
												احراز هویت شد
											</div>
										</div>
										<Button
											variant="outline"
											className="w-full border-slate-600 text-slate-100"
											onClick={logoutAdmin}
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
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
										<Button
											onClick={() => void loginAdmin()}
											disabled={isAuthLoading || !adminPassword.trim()}
											className="w-full bg-cyan-700 text-white hover:bg-cyan-600"
										>
											<ShieldCheck className="h-4 w-4" />
											{isAuthLoading ? "در حال ورود..." : "ورود"}
										</Button>
										{authError ? (
											<div className="rounded border border-rose-500/40 bg-rose-950/30 p-2 text-xs text-rose-100">
												{authError}
											</div>
										) : null}
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-amber-100">
									<ShieldAlert className="h-4 w-4" />
									کنترل بازی
								</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-1 gap-2">
								<Button
									disabled={!api || !gameId}
									onClick={() => {
										if (!api || !gameId) return;
										void runControl(
											() => api.startGame(gameId),
											"بازی شروع شد.",
										);
									}}
									className="bg-emerald-700 text-white hover:bg-emerald-600"
								>
									<Play className="h-4 w-4" />
									شروع بازی
								</Button>
								<Button
									disabled={!api || !gameId}
									variant="outline"
									className="border-amber-500/60 text-amber-100 hover:bg-amber-950/30"
									onClick={() => {
										if (!api || !gameId) return;
										void runControl(
											() => api.pauseGame(gameId),
											"بازی متوقف شد.",
										);
									}}
								>
									<Pause className="h-4 w-4" />
									توقف موقت
								</Button>
								<Button
									disabled={!api || !gameId}
									variant="outline"
									className="border-emerald-500/60 text-emerald-100 hover:bg-emerald-950/30"
									onClick={() => {
										if (!api || !gameId) return;
										void runControl(
											() => api.resumeGame(gameId),
											"بازی از سر گرفته شد.",
										);
									}}
								>
									<Play className="h-4 w-4" />
									ادامه بازی
								</Button>
								<Button
									disabled={!api || !gameId}
									variant="outline"
									className="border-amber-500/60 text-amber-100 hover:bg-amber-950/30"
									onClick={() => {
										if (
											!api ||
											!gameId ||
											!window.confirm("بازی فعال بازنشانی شود؟")
										)
											return;
										void runControl(
											() => api.resetGame(gameId),
											"بازی بازنشانی شد.",
										);
									}}
								>
									<RotateCcw className="h-4 w-4" />
									بازنشانی بازی
								</Button>
								<Button
									disabled={!api || !gameId}
									variant="outline"
									className="border-rose-500/60 text-rose-100 hover:bg-rose-950/30"
									onClick={() => {
										if (
											!api ||
											!gameId ||
											!window.confirm("رویدادهای ذخیره‌شده این بازی پاک شوند؟")
										) {
											return;
										}
										void runControl(
											() => api.clearGameEvents(gameId),
											"گزارش رویدادها پاک شد.",
										);
									}}
								>
									<Ban className="h-4 w-4" />
									پاک‌کردن رویدادها
								</Button>
								<Button
									disabled={!api || directives.length === 0}
									variant="outline"
									className="border-slate-600 text-slate-100 hover:bg-slate-900"
									onClick={() => {
										if (!api || !window.confirm("همه دستورها پاک شوند؟"))
											return;
										void runControl(
											() => api.clearDirectives(),
											"دستورها پاک شدند.",
										);
									}}
								>
									<Trash2 className="h-4 w-4" />
									پاک‌کردن دستورها
								</Button>
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-violet-100">
									<Zap className="h-4 w-4" />
									افزودن دستور زنده
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 gap-3">
									<div className="space-y-2">
										<Label>نام</Label>
										<Input
											value={directiveName}
											onChange={(event) => setDirectiveName(event.target.value)}
											className="border-slate-700 bg-slate-900/80 text-slate-100"
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label>اثر</Label>
											<Select value={effectType} onValueChange={setEffectType}>
												<SelectTrigger className="w-full border-slate-700 bg-slate-900/80 text-slate-100">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
													<SelectItem value="probability">احتمال</SelectItem>
													<SelectItem value="cost">هزینه</SelectItem>
													<SelectItem value="growth">رشد</SelectItem>
													<SelectItem value="tech">فناوری</SelectItem>
													<SelectItem value="limit">محدودیت</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>عملگر</Label>
											<Select
												value={modifierType}
												onValueChange={setModifierType}
											>
												<SelectTrigger className="w-full border-slate-700 bg-slate-900/80 text-slate-100">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
													<SelectItem value="increase">افزایش</SelectItem>
													<SelectItem value="decrease">کاهش</SelectItem>
													<SelectItem value="multiply">ضرب</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label>عملیات هدف</Label>
											<Input
												value={targetAction}
												onChange={(event) =>
													setTargetAction(event.target.value)
												}
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
										<div className="space-y-2">
											<Label>نوع هدف</Label>
											<Select
												value={targetActionType}
												onValueChange={setTargetActionType}
											>
												<SelectTrigger className="w-full border-slate-700 bg-slate-900/80 text-slate-100">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
													<SelectItem value="attack">حمله</SelectItem>
													<SelectItem value="defense">دفاع</SelectItem>
													<SelectItem value="both">هر دو</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="grid grid-cols-3 gap-3">
										<div className="space-y-2">
											<Label>مقدار</Label>
											<Input
												value={directiveValue}
												onChange={(event) =>
													setDirectiveValue(event.target.value)
												}
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
										<div className="space-y-2">
											<Label>شروع</Label>
											<Input
												value={startTurn}
												onChange={(event) => setStartTurn(event.target.value)}
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
										<div className="space-y-2">
											<Label>مدت</Label>
											<Input
												value={duration}
												onChange={(event) => setDuration(event.target.value)}
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label>سمت‌های متاثر</Label>
										<Input
											value={affectedSides}
											onChange={(event) => setAffectedSides(event.target.value)}
											placeholder="Red, Blue"
											className="border-slate-700 bg-slate-900/80 text-slate-100"
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label>نوع محدودیت</Label>
											<Input
												value={limitType}
												onChange={(event) => setLimitType(event.target.value)}
												placeholder="disable_attack"
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
										<div className="space-y-2">
											<Label>مقدار محدودیت</Label>
											<Input
												value={limitValue}
												onChange={(event) => setLimitValue(event.target.value)}
												className="border-slate-700 bg-slate-900/80 text-slate-100"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label>پیش‌نمایش payload</Label>
										<Textarea
											readOnly
											value={JSON.stringify(
												{
													directives: [
														{
															name: directiveName,
															effect_type: effectType,
															target_action: targetAction,
															target_action_type: targetActionType,
															value: Number(directiveValue) || 0,
															start_turn: Number(startTurn) || currentTurn,
															duration: Number(duration) || 1,
															modifier_type: modifierType,
															affected_sides: affectedSides
																.split(",")
																.map((item) => item.trim())
																.filter(Boolean),
															limit_type: limitType || null,
															limit_value: limitValue
																? Number(limitValue)
																: null,
														},
													],
												},
												null,
												2,
											)}
											className="max-h-48 min-h-32 border-slate-700 bg-slate-900/80 font-mono text-left text-xs text-slate-200"
											dir="ltr"
										/>
									</div>
								</div>
								<Button
									disabled={!api}
									onClick={() => void addDirective()}
									className="w-full bg-violet-700 text-white hover:bg-violet-600"
								>
									<Send className="h-4 w-4" />
									افزودن دستور
								</Button>
							</CardContent>
						</Card>

						<Card className="border-slate-800 bg-slate-950/72 text-slate-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base text-slate-100">
									<Eye className="h-4 w-4" />
									نمای کاتالوگ
								</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-3 gap-2 text-xs">
								<div className="rounded border border-slate-800 bg-slate-900/60 p-3">
									<div className="text-slate-500">سمت‌ها</div>
									<div className="mt-1 text-lg font-semibold">
										{sides.length}
									</div>
								</div>
								<div className="rounded border border-slate-800 bg-slate-900/60 p-3">
									<div className="text-slate-500">تیم‌ها</div>
									<div className="mt-1 text-lg font-semibold">
										{teams.length}
									</div>
								</div>
								<div className="rounded border border-slate-800 bg-slate-900/60 p-3">
									<div className="text-slate-500">عملیات‌ها</div>
									<div className="mt-1 text-lg font-semibold">
										{actions.length}
									</div>
								</div>
							</CardContent>
						</Card>
					</aside>
				</main>
			</div>
		</div>
	);
}
