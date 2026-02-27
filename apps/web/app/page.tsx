"use client";

import { createGameClientApi } from "@workspace/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Clock3,
	Coins,
	LogOut,
	Radio,
	RefreshCw,
	Send,
	ShieldAlert,
	Trophy,
	Volume2,
	VolumeX,
	Swords,
	Target,
	Users,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth.store.ts";

type NullableNumber = number | null;

type ApiEnvelope<T> = {
	success?: boolean;
	data?: T;
	error?: unknown;
	timestamp?: number;
	schemaVersion?: number;
};

interface GameSummary {
	id?: number | string;
	gameId?: number | string;
	phase?: string;
	currentTurn?: number;
	totalTurns?: number;
	pointThreshold?: number;
	winnerSideId?: number | string | null;
}

interface GameSide {
	id: number;
	name: string;
	totalCredits: number;
	teamIds: number[];
}

interface GameTeam {
	id: number;
	name: string;
	sideId: number;
	points: number;
	credits: number;
	vulnerabilities: Record<string, unknown>;
	activeEffects: unknown[];
}

interface GamePlayer {
	id: number;
	name: string;
	teamId: number;
	isLeader: boolean;
	voteWeight: number;
	connected: boolean;
}

interface GameAction {
	id: number;
	category: string;
	name: string;
	displayName?: string;
	cost: number;
	probability: number;
	counterActionId?: number | null;
	counterActionName?: string | null;
}

interface GameBlackMarketItem {
	id: number;
	name: string;
	cost: number;
	itemType?: string;
	item_type?: string;
	effectType?: string;
	effect_type?: string;
	targetActionId?: number;
	value?: number;
	duration?: number;
}

interface GameStatePayload {
	game: GameSummary;
	clientContext: Record<string, unknown> | null;
	sides: GameSide[];
	teams: GameTeam[];
	players: GamePlayer[];
	actions: GameAction[];
	blackMarketItems: GameBlackMarketItem[];
	events: unknown[];
	byId?: Record<string, unknown>;
}

interface ClientActionsPayload {
	actions: GameAction[];
	playerId?: number;
	teamId?: number;
}

interface ClientTarget {
	id: number;
	name: string;
	sideId: number;
	sideName?: string;
	points?: number;
	credits?: number;
}

interface ClientTargetsPayload {
	targets: ClientTarget[];
	playerId?: number;
	teamId?: number;
}

interface SseLogEvent {
	id: string;
	receivedAt: number;
	eventType: string;
	payload: unknown;
}

interface TeamChatMessage {
	id: string;
	teamId: number | null;
	senderId: number | null;
	senderName: string;
	text: string;
	createdAt: number;
	source: "local" | "server";
}

type ChatTransportMode = "unknown" | "http" | "local";
type EventTone = "info" | "success" | "warning" | "danger";

interface VisualEvent {
	id: string;
	eventType: string;
	title: string;
	description: string;
	tone: EventTone;
	receivedAt: number;
	payload: unknown;
}

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";
const POLL_INTERVAL_MS = 6000;
const SSE_RECONNECT_MS = 3000;
const MAX_EVENTS = 80;
const MAX_CHAT_MESSAGES = 180;

const CHAT_ENDPOINT_CANDIDATES = [
	"/client/team_chat",
	"/client/chat/team",
	"/client/team/messages",
	"/client/chat",
];

const toNumberOrNull = (value: unknown): NullableNumber => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
};

const normalizeGameId = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, unknown>;
};

const extractMessageFromUnknown = (value: unknown, fallback: string): string => {
	if (!value) return fallback;
	if (typeof value === "string") return value;

	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		if (typeof obj.message === "string" && obj.message.trim()) {
			return obj.message;
		}
		if (typeof obj.detail === "string" && obj.detail.trim()) {
			return obj.detail;
		}
		if (obj.error) {
			return extractMessageFromUnknown(obj.error, fallback);
		}
	}

	return fallback;
};

const parseApiEnvelope = <T extends object>(
	raw: unknown,
	fallbackError: string,
): { data: T | null; error: string | null } => {
	if (!raw || typeof raw !== "object") {
		return { data: null, error: fallbackError };
	}

	const obj = raw as Record<string, unknown>;
	if (obj.success === false) {
		return {
			data: null,
			error: extractMessageFromUnknown(obj.error ?? obj, fallbackError),
		};
	}

	if ("data" in obj) {
		const data = obj.data;
		if (data && typeof data === "object") {
			return { data: data as T, error: null };
		}
		return { data: null, error: fallbackError };
	}

	return { data: obj as T, error: null };
};

const parseSsePayload = (raw: string): unknown => {
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
};

const extractSinceFromPayload = (payload: unknown, fallback: number): number => {
	const keys = ["since", "seq", "timestamp", "eventId", "id"];

	const read = (candidate: unknown): number | null => {
		if (!candidate || typeof candidate !== "object") return null;
		const obj = candidate as Record<string, unknown>;
		for (const key of keys) {
			const value = toNumberOrNull(obj[key]);
			if (value !== null) return value;
		}
		return null;
	};

	const direct = read(payload);
	if (direct !== null) return direct;

	const payloadObj = asRecord(payload);
	const nested = read(payloadObj?.data);
	return nested ?? fallback;
};

const getErrorStatus = (error: unknown): number | null => {
	if (!error || typeof error !== "object") return null;
	const maybe = error as { response?: { status?: unknown }; status?: unknown };
	return toNumberOrNull(maybe.response?.status) ?? toNumberOrNull(maybe.status);
};

const getErrorMessage = (error: unknown, fallback: string): string => {
	if (!error || typeof error !== "object") return fallback;
	const maybe = error as {
		message?: unknown;
		response?: { data?: unknown };
	};

	if (maybe.response?.data) {
		return extractMessageFromUnknown(maybe.response.data, fallback);
	}
	if (typeof maybe.message === "string" && maybe.message.trim()) {
		return maybe.message;
	}

	return fallback;
};

const extractContextNumber = (
	ctx: Record<string, unknown> | null | undefined,
	keys: string[],
): number | null => {
	if (!ctx) return null;
	for (const key of keys) {
		const value = toNumberOrNull(ctx[key]);
		if (value !== null) return value;
	}
	return null;
};

const pickString = (values: unknown[]): string | null => {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return null;
};

const parseChatEvent = (
	eventType: string,
	payload: unknown,
): {
	id: string;
	teamId: number;
	senderId: number | null;
	senderName: string;
	text: string;
	timestamp: number;
} | null => {
	const root = asRecord(payload);
	if (!root) return null;
	const data = asRecord(root.data) ?? root;

	const hints = [
		eventType,
		root.event,
		root.type,
		data.event,
		data.type,
		data.channel,
	]
		.filter((item) => typeof item === "string")
		.join(" ")
		.toUpperCase();

	if (!hints.includes("CHAT") && !hints.includes("TEAM_MESSAGE") && !hints.includes("TEAM_CHAT")) {
		return null;
	}

	const text = pickString([
		data.message,
		data.text,
		data.content,
		root.message,
		root.text,
	]);
	if (!text) return null;

	const teamId =
		toNumberOrNull(data.teamId ?? data.team_id ?? root.teamId ?? root.team_id) ?? null;
	if (teamId === null) return null;

	const senderName =
		pickString([
			data.senderName,
			data.sender_name,
			data.userName,
			data.username,
			root.senderName,
		]) ?? "هم‌تیمی";

	const senderId =
		toNumberOrNull(data.senderId ?? data.sender_id ?? data.userId ?? data.user_id ?? root.senderId) ?? null;

	const timestamp =
		toNumberOrNull(data.timestamp ?? root.timestamp ?? data.time ?? root.time) ?? Date.now();

	const messageId =
		pickString([
			data.messageId,
			data.message_id,
			data.id,
			root.messageId,
			root.id,
		]) ?? `${timestamp}-${teamId}-${senderName}-${text.slice(0, 12)}`;

	return {
		id: messageId,
		teamId,
		senderId,
		senderName,
		text,
		timestamp,
	};
};

const prettifyEventType = (eventType: string): string => {
	return eventType
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildVisualEvent = (
	eventType: string,
	payload: unknown,
	receivedAt: number,
): VisualEvent => {
	const type = (eventType || "message").toUpperCase();
	const root = asRecord(payload);
	const data = asRecord(root?.data) ?? root ?? {};

	const attacker = asRecord(data.attacker);
	const defender = asRecord(data.defender);
	const attack = asRecord(data.attack);
	const defense = asRecord(data.defense);
	const result = asRecord(data.result);
	const voter = asRecord(data.voter);
	const teamStatus = asRecord(data.teamStatus);
	const effect = asRecord(data.effect);
	const action = asRecord(data.action);

	let tone: EventTone = "info";
	let title = prettifyEventType(type);
	let description = pickString([
		data.message,
		data.detail,
		root?.message,
		root?.detail,
	]) ?? "رویداد جدید دریافت شد.";

	if (type.includes("GAME_STARTED")) {
		tone = "success";
		title = "بازی شروع شد";
		description = "فاز عملیاتی آغاز شد. آماده ارسال رأی اکشن باشید.";
	} else if (type.includes("TURN_STARTED")) {
		tone = "info";
		title = `شروع نوبت ${toNumberOrNull(data.turnNumber) ?? "—"}`;
		description = `فاز جاری: ${pickString([data.phase, data.turnPhase]) ?? "نامشخص"}`;
	} else if (type.includes("TEAM_TARGET_SELECTED")) {
		tone = "warning";
		title = "هدف تیم انتخاب شد";
		description = `${pickString([data.teamName]) ?? "تیم"} هدف ${pickString([
			data.targetTeamName,
		]) ?? "نامشخص"} را انتخاب کرد.`;
	} else if (type.includes("VOTING_STARTED")) {
		tone = "info";
		title = "فاز رأی‌گیری شروع شد";
		description = `اکشن پیشنهادی: ${pickString([action?.name, action?.code]) ?? "نامشخص"}`;
	} else if (type.includes("TEAMMATE_ACTION_SELECTED")) {
		tone = "info";
		title = "هم‌تیمی اکشن انتخاب کرد";
		description = `${pickString([voter?.userName, data.userName, data.playerName]) ?? "یک بازیکن"} اکشن ${pickString([action?.name, action?.code]) ?? "نامشخص"} را انتخاب کرد.`;
	} else if (type.includes("VOTE_SUBMITTED")) {
		const approved = asRecord(data.currentTally)?.approved === true;
		tone = approved ? "success" : "info";
		title = approved ? "رأی تأیید شد" : "رأی ثبت شد";
		description = `${pickString([voter?.userName, data.userName]) ?? "بازیکن"} رأی خود را ثبت کرد.`;
	} else if (type.includes("ACTION_EXECUTED")) {
		const success = result?.success === true;
		const blocked = result?.blocked === true;
		tone = success ? "success" : blocked ? "warning" : "danger";
		title = success ? "حمله موفق" : blocked ? "حمله بلاک شد" : "حمله ناموفق";
		description = `${pickString([attacker?.teamName]) ?? "تیم مهاجم"} با ${pickString([
			attack?.name,
			attack?.code,
		]) ?? "اکشن"} به ${pickString([defender?.teamName]) ?? "تیم مقابل"} حمله کرد${defense ? ` (دفاع: ${pickString([defense.name, defense.code]) ?? "—"})` : ""}.`;
	} else if (type.includes("ACTION_UNLOCKED")) {
		tone = "success";
		title = "اکشن جدید باز شد";
		description = `${pickString([action?.name, action?.code]) ?? "یک اکشن"} برای تیم قابل استفاده شد.`;
	} else if (type.includes("EFFECT_APPLIED")) {
		tone = "warning";
		title = "افکت فعال شد";
		description = `${pickString([effect?.name]) ?? "افکت"} اعمال شد (مدت: ${toNumberOrNull(effect?.remainingTurns) ?? toNumberOrNull(effect?.duration) ?? "?"} نوبت).`;
	} else if (
		type.includes("GAME_FINISHED") ||
		type.includes("GAME_OVER") ||
		type.includes("GAME_ENDED")
	) {
		tone = "success";
		title = "بازی پایان یافت";
		description = "نتیجه نهایی مشخص شد.";
	} else if (type.includes("ERROR") || type.includes("FAILED")) {
		tone = "danger";
		title = "خطای عملیاتی";
		description = extractMessageFromUnknown(payload, "یک خطای اجرایی رخ داد.");
	} else if (type.includes("GAME_STATE_SNAPSHOT")) {
		tone = "info";
		title = "همگام‌سازی وضعیت";
		description = `فاز فعلی: ${pickString([data.phase, asRecord(data.game)?.status]) ?? "نامشخص"}`;
	}

	if (teamStatus?.readyForVoting === true) {
		description += " تیم شما آماده رأی‌گیری است.";
	}

	return {
		id: `${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
		eventType: type,
		title,
		description,
		tone,
		receivedAt,
		payload,
	};
};

export default function PlayerGamePageV2() {
	const router = useRouter();
	const { token, user, clearAuth } = useAuthStore();

	const [hydrated, setHydrated] = useState(false);
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);
	const [actionsError, setActionsError] = useState<string | null>(null);
	const [targetsError, setTargetsError] = useState<string | null>(null);

	const [gameState, setGameState] = useState<GameStatePayload | null>(null);
	const [actionsPayload, setActionsPayload] = useState<ClientActionsPayload | null>(null);
	const [targetsPayload, setTargetsPayload] = useState<ClientTargetsPayload | null>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

	const [sseConnected, setSseConnected] = useState(false);
	const [sseError, setSseError] = useState<string | null>(null);
	const [sseEvents, setSseEvents] = useState<SseLogEvent[]>([]);
	const [visualEvents, setVisualEvents] = useState<VisualEvent[]>([]);
	const [gameEndedSignalReceived, setGameEndedSignalReceived] = useState(false);

	const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
	const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<number | null>(null);
	const [selectedBlackMarketItemId, setSelectedBlackMarketItemId] = useState<number | null>(null);
	const [isSubmittingVote, setIsSubmittingVote] = useState(false);
	const [voteError, setVoteError] = useState<string | null>(null);
	const [voteStatus, setVoteStatus] = useState<string | null>(null);
	const [soundEnabled, setSoundEnabled] = useState(true);

	const [chatMessages, setChatMessages] = useState<TeamChatMessage[]>([]);
	const [chatDraft, setChatDraft] = useState("");
	const [chatError, setChatError] = useState<string | null>(null);
	const [isSendingChat, setIsSendingChat] = useState(false);

	const refreshInFlightRef = useRef(false);
	const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const streamSinceRef = useRef(0);
	const chatTransportModeRef = useRef<ChatTransportMode>("unknown");
	const connectAttemptRef = useRef<string | null>(null);
	const gameEndedRefreshRef = useRef(false);

	const clientApi = useMemo(() => {
		if (!token || !BASE_URL) return null;
		return createGameClientApi({
			baseURL: BASE_URL,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
	}, [token]);

	const activeGameId = useMemo(() => {
		return normalizeGameId(gameState?.game?.gameId) ?? normalizeGameId(gameState?.game?.id);
	}, [gameState]);

	useEffect(() => {
		gameEndedRefreshRef.current = false;
		setGameEndedSignalReceived(false);
	}, [activeGameId]);

	const currentPlayerId = useMemo(() => {
		if (typeof actionsPayload?.playerId === "number") return actionsPayload.playerId;
		if (typeof targetsPayload?.playerId === "number") return targetsPayload.playerId;
		const ctxPlayerId = extractContextNumber(gameState?.clientContext, [
			"playerId",
			"currentPlayerId",
			"currentUserId",
			"userId",
		]);
		if (ctxPlayerId !== null) return ctxPlayerId;
		return user?.id ?? null;
	}, [actionsPayload, targetsPayload, gameState, user]);

	const currentTeamId = useMemo(() => {
		if (typeof actionsPayload?.teamId === "number") return actionsPayload.teamId;
		if (typeof targetsPayload?.teamId === "number") return targetsPayload.teamId;
		return extractContextNumber(gameState?.clientContext, [
			"teamId",
			"currentTeamId",
			"team_id",
		]);
	}, [actionsPayload, targetsPayload, gameState]);

	const currentTeam = useMemo(() => {
		if (!gameState || currentTeamId === null) return null;
		return gameState.teams.find((team) => team.id === currentTeamId) ?? null;
	}, [gameState, currentTeamId]);

	const phaseName = useMemo(() => {
		return String(gameState?.game?.phase ?? "unknown");
	}, [gameState]);

	const normalizedPhase = useMemo(() => phaseName.toLowerCase(), [phaseName]);
	const isSelectionPhase = normalizedPhase.includes("selection");
	const isVotingPhase = normalizedPhase.includes("voting");
	const isFinishedPhase = normalizedPhase.includes("finish");
	const shouldStopLiveUpdates = isFinishedPhase || gameEndedSignalReceived;

	const chatStorageKey = useMemo(() => {
		if (!activeGameId || currentTeamId === null) return null;
		return `team-chat:${activeGameId}:${currentTeamId}`;
	}, [activeGameId, currentTeamId]);

	const selectedAction = useMemo(
		() => actionsPayload?.actions?.find((action) => action.id === selectedActionId) ?? null,
		[actionsPayload, selectedActionId],
	);
	const selectedTarget = useMemo(
		() => targetsPayload?.targets?.find((target) => target.id === selectedTargetTeamId) ?? null,
		[targetsPayload, selectedTargetTeamId],
	);
	const selectedBlackMarketItem = useMemo(
		() => gameState?.blackMarketItems?.find((item) => item.id === selectedBlackMarketItemId) ?? null,
		[gameState, selectedBlackMarketItemId],
	);

	const logoutAndRedirect = useCallback(() => {
		clearAuth();
		router.replace("/login");
	}, [clearAuth, router]);

	const appendChatMessage = useCallback((message: TeamChatMessage) => {
		setChatMessages((prev) => {
			if (prev.some((item) => item.id === message.id)) return prev;
			return [...prev, message].slice(-MAX_CHAT_MESSAGES);
		});
	}, []);

	const refreshAll = useCallback(
		async (options?: { initial?: boolean; background?: boolean }) => {
			if (!clientApi || !token) return;
			if (refreshInFlightRef.current) return;

			refreshInFlightRef.current = true;
			if (!options?.background) {
				setIsRefreshing(true);
			}
			setGlobalError(null);

			try {
				const [gameRes, actionsRes, targetsRes] = await Promise.allSettled([
					clientApi.getGameState(),
					clientApi.getActions(),
					clientApi.getTargets(),
				]);

				if (gameRes.status === "rejected") {
					throw gameRes.reason;
				}

				const parsedGame = parseApiEnvelope<GameStatePayload>(
					gameRes.value as ApiEnvelope<GameStatePayload>,
					"پاسخ game_state نامعتبر است.",
				);
				if (parsedGame.error || !parsedGame.data?.game) {
					throw new Error(parsedGame.error ?? "پاسخ game_state نامعتبر است.");
				}
					setGameState(parsedGame.data);
					setLastUpdatedAt(Date.now());

					const phaseFromApi = String(parsedGame.data.game.phase ?? "").toLowerCase();
					if (phaseFromApi.includes("finish")) {
						setGameEndedSignalReceived(true);
						setSseError("بازی پایان یافت. اتصال رویداد زنده متوقف شد.");
					}

				if (actionsRes.status === "fulfilled") {
					const parsedActions = parseApiEnvelope<ClientActionsPayload>(
						actionsRes.value as ApiEnvelope<ClientActionsPayload>,
						"پاسخ actions نامعتبر است.",
					);
					setActionsError(parsedActions.error);
					setActionsPayload(parsedActions.data);
				} else {
					setActionsError(getErrorMessage(actionsRes.reason, "خطا در دریافت actions"));
					setActionsPayload(null);
				}

				if (targetsRes.status === "fulfilled") {
					const parsedTargets = parseApiEnvelope<ClientTargetsPayload>(
						targetsRes.value as ApiEnvelope<ClientTargetsPayload>,
						"پاسخ targets نامعتبر است.",
					);
					setTargetsError(parsedTargets.error);
					setTargetsPayload(parsedTargets.data);
				} else {
					setTargetsError(getErrorMessage(targetsRes.reason, "خطا در دریافت targets"));
					setTargetsPayload(null);
				}
			} catch (error) {
				const status = getErrorStatus(error);
				if (status === 401 || status === 403) {
					logoutAndRedirect();
					return;
				}
				setGlobalError(getErrorMessage(error, "خطا در دریافت وضعیت بازی"));
			} finally {
				if (options?.initial) {
					setIsInitialLoading(false);
				}
				if (!options?.background) {
					setIsRefreshing(false);
				}
				refreshInFlightRef.current = false;
			}
		},
		[clientApi, logoutAndRedirect, token],
	);

	const scheduleRefreshFromSse = useCallback(() => {
		if (refreshDebounceRef.current) return;
		refreshDebounceRef.current = setTimeout(() => {
			refreshDebounceRef.current = null;
			void refreshAll({ background: true });
		}, 400);
	}, [refreshAll]);

	const playUiSound = useCallback(
		async (src: string, volume = 0.45) => {
			if (!soundEnabled) return;
			try {
				const audio = new Audio(src);
				audio.volume = volume;
				await audio.play();
			} catch {
				// Browser might block autoplay until user interaction.
			}
		},
		[soundEnabled],
	);

	const playEventSound = useCallback(
		(eventType: string) => {
			const type = eventType.toUpperCase();
			if (type.includes("GAME_STATE_SNAPSHOT") || type === "MESSAGE") return;

			if (type.includes("ACTION_EXECUTED") || type.includes("TEAM_TARGET_SELECTED")) {
				void playUiSound("/sounds/computer-mouse-click-351398.mp3", 0.55);
				return;
			}
			if (
				type.includes("GAME_FINISHED") ||
				type.includes("GAME_OVER") ||
				type.includes("GAME_ENDED")
			) {
				void playUiSound("/sounds/640149main_Computers20are20in20Control.mp3", 0.32);
				return;
			}
			void playUiSound("/sounds/new-notification-021-370045.mp3", 0.35);
		},
		[playUiSound],
	);

	const submitVoteAction = useCallback(async () => {
		if (!token || !BASE_URL) return;
		if (shouldStopLiveUpdates) {
			setVoteError("بازی به پایان رسیده است و رأی جدید پذیرفته نمی‌شود.");
			return;
		}
		if (currentTeamId === null) {
			setVoteError("شما هنوز به تیمی اختصاص داده نشده‌اید.");
			return;
		}

		const payload: Record<string, unknown> = {};
		if (isSelectionPhase) {
			if (selectedTargetTeamId === null) {
				setVoteError("برای فاز انتخاب، باید یک هدف انتخاب کنید.");
				return;
			}
			payload.selection_only = true;
			payload.target_team_id = selectedTargetTeamId;
			if (selectedActionId !== null) {
				// Backward compatibility with servers that still require action_id.
				payload.action_id = selectedActionId;
			}
		} else {
			if (selectedActionId === null) {
				setVoteError("ابتدا یک اکشن انتخاب کنید.");
				return;
			}
			payload.selection_only = false;
			payload.action_id = selectedActionId;
			if (selectedTargetTeamId !== null) {
				payload.target_team_id = selectedTargetTeamId;
			}
			if (selectedBlackMarketItemId !== null) {
				payload.black_market_item_id = selectedBlackMarketItemId;
			}
		}

		setVoteError(null);
		setVoteStatus(null);
		setIsSubmittingVote(true);

		try {
			const response = await fetch(`${BASE_URL}/client/vote_action`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (response.status === 401 || response.status === 403) {
				logoutAndRedirect();
				return;
			}

			const contentType = response.headers.get("content-type") ?? "";
			const responseBody: unknown = contentType.includes("application/json")
				? await response.json().catch(() => null)
				: await response.text().catch(() => null);

			if (!response.ok) {
				throw new Error(
					extractMessageFromUnknown(
						responseBody,
						`ثبت رأی با خطای ${response.status} مواجه شد.`,
					),
				);
			}

			const message = extractMessageFromUnknown(
				responseBody,
				isSelectionPhase ? "انتخاب هدف با موفقیت ثبت شد." : "رأی اکشن با موفقیت ثبت شد.",
			);
			setVoteStatus(message);
			void playUiSound("/sounds/computer-mouse-click-351398.mp3", 0.5);

			setVisualEvents((prev) => {
				const localEvent = buildVisualEvent(
					isSelectionPhase ? "TEAM_TARGET_SELECTED_LOCAL" : "VOTE_SUBMITTED_LOCAL",
					{ data: { message, payload } },
					Date.now(),
				);
				return [localEvent, ...prev].slice(0, MAX_EVENTS);
			});

			void refreshAll({ background: true });
		} catch (error) {
			const status = getErrorStatus(error);
			if (status === 401 || status === 403) {
				logoutAndRedirect();
				return;
			}
			setVoteError(getErrorMessage(error, "ثبت رأی انجام نشد."));
		} finally {
			setIsSubmittingVote(false);
		}
	}, [
		token,
		currentTeamId,
		isSelectionPhase,
		shouldStopLiveUpdates,
		selectedTargetTeamId,
		selectedActionId,
		selectedBlackMarketItemId,
		logoutAndRedirect,
		playUiSound,
		refreshAll,
	]);

	const sendTeamChatToServer = useCallback(
		async (text: string): Promise<boolean> => {
			if (!token || !BASE_URL || currentTeamId === null) return false;
			if (chatTransportModeRef.current === "local") return false;

			let encounteredNon404 = false;

			for (const endpoint of CHAT_ENDPOINT_CANDIDATES) {
				const url = `${BASE_URL}${endpoint}`;
				const response = await fetch(url, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({
						message: text,
						text,
						content: text,
						teamId: currentTeamId,
						gameId: activeGameId,
					}),
				});

				if (response.status === 404) {
					continue;
				}

				encounteredNon404 = true;

				if (response.status === 401 || response.status === 403) {
					const authError = new Error("جلسه شما منقضی شده است.") as Error & { status?: number };
					authError.status = response.status;
					throw authError;
				}

				if (!response.ok) {
					const errorText = await response.text().catch(() => "");
					throw new Error(
						extractMessageFromUnknown(
							errorText || `ارسال پیام با خطای ${response.status} مواجه شد.`,
							"ارسال پیام ناموفق بود.",
						),
					);
				}

				chatTransportModeRef.current = "http";
				return true;
			}

			if (!encounteredNon404) {
				chatTransportModeRef.current = "local";
			}

			return false;
		},
		[token, currentTeamId, activeGameId],
	);

	const handleSendChat = useCallback(async () => {
		const text = chatDraft.trim();
		if (!text) return;
		if (!token) return;
		if (shouldStopLiveUpdates) {
			setChatError("بازی پایان یافته است و چت تیمی بسته شد.");
			return;
		}
		if (currentTeamId === null) {
			setChatError("تا زمانی که به تیمی متصل نشده‌اید، چت فعال نمی‌شود.");
			return;
		}

		setChatError(null);
		setIsSendingChat(true);

		const localMessage: TeamChatMessage = {
			id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			teamId: currentTeamId,
			senderId: currentPlayerId,
			senderName: user?.username ?? "شما",
			text,
			createdAt: Date.now(),
			source: "local",
		};

		appendChatMessage(localMessage);
		setChatDraft("");

		try {
			await sendTeamChatToServer(text);
		} catch (error) {
			const status = getErrorStatus(error);
			if (status === 401 || status === 403) {
				logoutAndRedirect();
				return;
			}
			setChatError(getErrorMessage(error, "ارسال پیام انجام نشد."));
		} finally {
			setIsSendingChat(false);
		}
	}, [
		appendChatMessage,
		chatDraft,
		currentPlayerId,
		currentTeamId,
		logoutAndRedirect,
		sendTeamChatToServer,
		shouldStopLiveUpdates,
		token,
		user,
	]);

	useEffect(() => {
		setHydrated(true);
		return () => {
			if (refreshDebounceRef.current) {
				clearTimeout(refreshDebounceRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		if (!token) {
			router.replace("/login");
			return;
		}
		void refreshAll({ initial: true });
	}, [hydrated, token, router, refreshAll]);

	useEffect(() => {
		if (!token || !clientApi || shouldStopLiveUpdates) return;
		const timer = setInterval(() => {
			void refreshAll({ background: true });
		}, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [token, clientApi, refreshAll, shouldStopLiveUpdates]);

	useEffect(() => {
		if (!token || !BASE_URL || currentPlayerId === null || shouldStopLiveUpdates) return;

		const key = `${activeGameId ?? "nogame"}:${currentPlayerId}`;
		if (connectAttemptRef.current === key) return;
		connectAttemptRef.current = key;

		void (async () => {
			try {
				const response = await fetch(
					`${BASE_URL}/client/connect/${encodeURIComponent(String(currentPlayerId))}`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
						},
					},
				);
				if (response.status === 401 || response.status === 403) {
					logoutAndRedirect();
				}
			} catch {
				// Optional readiness signal endpoint; ignore network errors.
			}
		})();
	}, [token, currentPlayerId, activeGameId, logoutAndRedirect, shouldStopLiveUpdates]);

	useEffect(() => {
		const actions = actionsPayload?.actions ?? [];
		if (selectedActionId !== null && !actions.some((item) => item.id === selectedActionId)) {
			setSelectedActionId(null);
		}
	}, [actionsPayload, selectedActionId]);

	useEffect(() => {
		const targets = targetsPayload?.targets ?? [];
		if (selectedTargetTeamId !== null && !targets.some((item) => item.id === selectedTargetTeamId)) {
			setSelectedTargetTeamId(null);
		}
	}, [targetsPayload, selectedTargetTeamId]);

	useEffect(() => {
		const market = gameState?.blackMarketItems ?? [];
		if (
			selectedBlackMarketItemId !== null &&
			!market.some((item) => item.id === selectedBlackMarketItemId)
		) {
			setSelectedBlackMarketItemId(null);
		}
	}, [gameState, selectedBlackMarketItemId]);

	useEffect(() => {
		if (!chatStorageKey) {
			setChatMessages([]);
			return;
		}

		try {
			const raw = localStorage.getItem(chatStorageKey);
			if (!raw) {
				setChatMessages([]);
				return;
			}
			const parsed = JSON.parse(raw) as TeamChatMessage[];
			if (!Array.isArray(parsed)) {
				setChatMessages([]);
				return;
			}
			setChatMessages(
				parsed
					.filter(
						(item) =>
							typeof item.id === "string" &&
							typeof item.text === "string" &&
							typeof item.createdAt === "number",
					)
					.slice(-MAX_CHAT_MESSAGES),
			);
		} catch {
			setChatMessages([]);
		}
	}, [chatStorageKey]);

	useEffect(() => {
		if (!chatStorageKey) return;
		try {
			localStorage.setItem(
				chatStorageKey,
				JSON.stringify(chatMessages.slice(-MAX_CHAT_MESSAGES)),
			);
		} catch {
			// Ignore persistence errors in private mode.
		}
	}, [chatMessages, chatStorageKey]);

	useEffect(() => {
		if (!token || !activeGameId || !BASE_URL || shouldStopLiveUpdates) return;

		let cancelled = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let abortController: AbortController | null = null;

		const handleSseEvent = (eventType: string, rawData: string, eventId: string | null) => {
			const normalizedEventType = (eventType || "message").toUpperCase();
			const payload = parseSsePayload(rawData);
			const receivedAt = Date.now();
			const fromPayload = extractSinceFromPayload(payload, streamSinceRef.current);
			const fromEventId = toNumberOrNull(eventId);
			streamSinceRef.current = Math.max(
				streamSinceRef.current,
				fromPayload,
				fromEventId ?? 0,
			);

			setSseEvents((prev) => {
				const next: SseLogEvent = {
					id: `${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
					receivedAt,
					eventType: normalizedEventType || "message",
					payload,
				};
				return [next, ...prev].slice(0, MAX_EVENTS);
			});

			setVisualEvents((prev) => {
				const visual = buildVisualEvent(normalizedEventType || "message", payload, receivedAt);
				return [visual, ...prev].slice(0, MAX_EVENTS);
			});

			playEventSound(normalizedEventType || "message");

			if (normalizedEventType.includes("GAME_ENDED")) {
				setGameEndedSignalReceived(true);
				setVoteStatus("بازی پایان یافت. نتیجه نهایی اعلام شد.");
				setVoteError(null);
				setSseError("بازی پایان یافت. اتصال رویداد زنده متوقف شد.");
				if (!gameEndedRefreshRef.current) {
					gameEndedRefreshRef.current = true;
					void refreshAll({ background: true });
				}
				return;
			}

			const chatEvent = parseChatEvent(eventType, payload);
			if (chatEvent && currentTeamId !== null && chatEvent.teamId === currentTeamId) {
				appendChatMessage({
					id: `server-${chatEvent.id}`,
					teamId: chatEvent.teamId,
					senderId: chatEvent.senderId,
					senderName: chatEvent.senderName,
					text: chatEvent.text,
					createdAt: chatEvent.timestamp,
					source: "server",
				});
			}

			scheduleRefreshFromSse();
		};

		const connect = async () => {
			if (cancelled) return;

			try {
				abortController = new AbortController();
				const streamUrl = `${BASE_URL}/api/games/${encodeURIComponent(activeGameId)}/events/stream?since=${streamSinceRef.current}`;
				const response = await fetch(streamUrl, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "text/event-stream",
						"Cache-Control": "no-cache",
					},
					signal: abortController.signal,
				});

				if (response.status === 401 || response.status === 403) {
					logoutAndRedirect();
					return;
				}

				if (!response.ok || !response.body) {
					throw new Error(`SSE stream failed: ${response.status}`);
				}

				setSseConnected(true);
				setSseError(null);

				const reader = response.body.getReader();
				const decoder = new TextDecoder("utf-8");
				let buffer = "";
				let eventType = "message";
				let eventId: string | null = null;
				let dataLines: string[] = [];

				const dispatchCurrentEvent = () => {
					if (dataLines.length === 0) return;
					const rawData = dataLines.join("\n");
					handleSseEvent(eventType, rawData, eventId);
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

					let lineBreakIndex = buffer.indexOf("\n");
					while (lineBreakIndex !== -1) {
						const rawLine = buffer.slice(0, lineBreakIndex);
						buffer = buffer.slice(lineBreakIndex + 1);
						const line = rawLine.endsWith("\r")
							? rawLine.slice(0, -1)
							: rawLine;

						if (line.length === 0) {
							dispatchCurrentEvent();
							lineBreakIndex = buffer.indexOf("\n");
							continue;
						}

						if (line.startsWith(":")) {
							lineBreakIndex = buffer.indexOf("\n");
							continue;
						}

						const separator = line.indexOf(":");
						const field = separator === -1 ? line : line.slice(0, separator);
						const valuePart =
							separator === -1 ? "" : line.slice(separator + 1).trimStart();

						if (field === "event") {
							eventType = valuePart || "message";
						} else if (field === "data") {
							dataLines.push(valuePart);
						} else if (field === "id") {
							eventId = valuePart || null;
						}

						lineBreakIndex = buffer.indexOf("\n");
					}
				}

				if (!cancelled) {
					setSseConnected(false);
					setSseError("اتصال رویداد لحظه‌ای قطع شد. تلاش مجدد در حال انجام است...");
					reconnectTimer = setTimeout(() => {
						void connect();
					}, SSE_RECONNECT_MS);
				}
			} catch (error) {
				if (cancelled) return;
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				const status = getErrorStatus(error);
				if (status === 401 || status === 403) {
					logoutAndRedirect();
					return;
				}

				setSseConnected(false);
				setSseError("اتصال رویداد لحظه‌ای قطع شد. تلاش مجدد در حال انجام است...");
				reconnectTimer = setTimeout(() => {
					void connect();
				}, SSE_RECONNECT_MS);
			}
		};

		void connect();

		return () => {
			cancelled = true;
			setSseConnected(false);
			if (reconnectTimer) clearTimeout(reconnectTimer);
			abortController?.abort();
		};
	}, [
		token,
		activeGameId,
		currentTeamId,
		appendChatMessage,
		shouldStopLiveUpdates,
		playEventSound,
		refreshAll,
		scheduleRefreshFromSse,
		logoutAndRedirect,
	]);

	useEffect(() => {
		if (!shouldStopLiveUpdates) return;
		setSseConnected(false);
		setSseError("بازی پایان یافت. رویدادهای زنده متوقف شدند.");
		if (refreshDebounceRef.current) {
			clearTimeout(refreshDebounceRef.current);
			refreshDebounceRef.current = null;
		}
	}, [shouldStopLiveUpdates]);

	if (!hydrated || !token) {
		return (
			<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
				<div className="text-sm text-slate-400">در حال بارگذاری...</div>
			</div>
		);
	}

	const game = gameState?.game;
	const phase = phaseName;
	const isWaiting = normalizedPhase === "waiting" || normalizedPhase.includes("waiting");
	const winnerSideId = toNumberOrNull(game?.winnerSideId);
	const winnerSide =
		winnerSideId !== null
			? (gameState?.sides ?? []).find((side) => side.id === winnerSideId) ?? null
			: null;
	const currentSideId =
		extractContextNumber(gameState?.clientContext, ["currentSideId", "sideId"]) ??
		currentTeam?.sideId ??
		null;
	const didCurrentSideWin =
		winnerSideId !== null && currentSideId !== null && winnerSideId === currentSideId;
	const resultTeams = [...(gameState?.teams ?? [])].sort((a, b) => b.points - a.points);
	const isGameLocked = shouldStopLiveUpdates;
	const connectedPlayers = gameState?.players?.filter((player) => player.connected).length ?? 0;
	const totalKnownPlayers = gameState?.players?.length ?? 0;
	const actions = actionsPayload?.actions ?? [];
	const targets = targetsPayload?.targets ?? [];
	const blackMarketItems = gameState?.blackMarketItems ?? [];
	const canSubmitSelection = !isGameLocked && !isWaiting && selectedTargetTeamId !== null;
	const canSubmitVoting =
		!isGameLocked && !isWaiting && selectedActionId !== null && !isSelectionPhase;
	const canSubmitVote = isSelectionPhase ? canSubmitSelection : canSubmitVoting;

	return (
		<div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_15%,rgba(14,116,144,0.26),transparent_35%),radial-gradient(circle_at_86%_12%,rgba(185,28,28,0.25),transparent_36%),linear-gradient(120deg,#030712_0%,#0b1220_42%,#020617_100%)] text-slate-100">
			<div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,.24)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.2)_1px,transparent_1px)] [background-size:34px_34px]" />
			<div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,.025)_0_2px,transparent_2px_6px)]" />

			<div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-4 md:px-6 md:pt-6">
				<header className="rounded-2xl border border-cyan-500/30 bg-slate-950/65 backdrop-blur-xl shadow-[0_0_50px_rgba(14,116,144,.18)] p-4 md:p-5">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<div className="text-xs tracking-[0.24em] text-cyan-300 uppercase">Attack Navigator / Player Console</div>
							<h1 className="mt-2 text-xl md:text-3xl font-bold text-white">میدان نبرد سایبری</h1>
							<div className="mt-1 text-sm text-cyan-100/80">
								{user?.username ? `خوش آمدید ${user.username}` : "کاربر نامشخص"}
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="border-cyan-500/50 text-cyan-200 bg-cyan-950/30">
								Game ID: {activeGameId ?? "—"}
							</Badge>
							<Badge
								variant="outline"
								className={
									isWaiting
										? "border-amber-500/60 text-amber-200 bg-amber-950/30"
										: "border-emerald-500/60 text-emerald-200 bg-emerald-950/30"
								}
							>
								Phase: {phase}
							</Badge>
								<Button
									onClick={() => void refreshAll()}
									disabled={isRefreshing || isInitialLoading}
									className="h-10 bg-cyan-700 hover:bg-cyan-600 text-white"
							>
									<RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? "animate-spin" : ""}`} />
									بروزرسانی
								</Button>
								<Button
									variant="outline"
									onClick={() => setSoundEnabled((prev) => !prev)}
									className="h-10 border-cyan-500/60 text-cyan-200 hover:bg-cyan-950/35"
								>
									{soundEnabled ? <Volume2 className="w-4 h-4 ml-2" /> : <VolumeX className="w-4 h-4 ml-2" />}
									{soundEnabled ? "صدا روشن" : "صدا خاموش"}
								</Button>
								<Button
									variant="outline"
									onClick={logoutAndRedirect}
									className="h-10 border-rose-500/60 text-rose-200 hover:bg-rose-950/40"
							>
								<LogOut className="w-4 h-4 ml-2" />
								خروج
							</Button>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
						<div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
							<div className="text-xs text-slate-400">نوبت</div>
							<div className="mt-1 font-semibold text-white">{game?.currentTurn ?? "—"} / {game?.totalTurns ?? "—"}</div>
						</div>
						<div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
							<div className="text-xs text-slate-400">امتیاز پیروزی</div>
							<div className="mt-1 font-semibold text-white">{game?.pointThreshold ?? "—"}</div>
						</div>
						<div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
							<div className="text-xs text-slate-400">اعتبار تیم شما</div>
							<div className="mt-1 font-semibold text-emerald-300">{currentTeam?.credits ?? "—"}</div>
						</div>
							<div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
								<div className="text-xs text-slate-400">وضعیت ارتباط زنده</div>
								<div className="mt-1 flex items-center gap-2 text-sm">
									<Radio
										className={`w-4 h-4 ${
											shouldStopLiveUpdates
												? "text-slate-400"
												: sseConnected
													? "text-emerald-300"
													: "text-amber-300"
										}`}
									/>
									{shouldStopLiveUpdates
										? "متوقف (پایان بازی)"
										: sseConnected
											? "متصل"
											: "در حال تلاش برای اتصال"}
								</div>
							</div>
					</div>
				</header>

				{globalError ? (
					<div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-100">
						{globalError}
					</div>
				) : null}

					{isWaiting ? (
						<div className="mt-4 rounded-xl border border-amber-500/45 bg-amber-950/35 p-4 flex items-start gap-3">
							<ShieldAlert className="w-5 h-5 text-amber-300 mt-0.5" />
							<div className="space-y-1 text-sm text-amber-100">
							<div className="font-semibold">بازی هنوز در حالت انتظار است</div>
							<div>برای شروع، همه بازیکنان باید حداقل یک بار وارد کلاینت شوند.</div>
							<div className="text-amber-200/90">بازیکنان متصل: {connectedPlayers} / {totalKnownPlayers}</div>
							</div>
						</div>
					) : null}

					{isFinishedPhase ? (
						<div className={`mt-4 rounded-xl border p-4 md:p-5 ${didCurrentSideWin ? "border-emerald-500/55 bg-emerald-950/25" : "border-slate-600/80 bg-slate-900/75"}`}>
							<div className="flex items-center gap-2 text-lg font-semibold text-white">
								<Trophy className={`w-5 h-5 ${didCurrentSideWin ? "text-emerald-300" : "text-amber-300"}`} />
								نتیجه نهایی بازی
							</div>
							<div className="mt-2 text-sm">
								{winnerSide ? (
									<span className={didCurrentSideWin ? "text-emerald-200" : "text-slate-200"}>
										برنده: <strong>{winnerSide.name}</strong>
										{didCurrentSideWin ? " - تیم شما پیروز شد." : " - تیم شما این بازی را واگذار کرد."}
									</span>
								) : (
									<span className="text-slate-200">بازی بدون برنده نهایی به پایان رسید.</span>
								)}
							</div>
							<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
								{resultTeams.map((team) => {
									const side = gameState?.sides.find((item) => item.id === team.sideId);
									const isWinnerTeam = winnerSideId !== null && team.sideId === winnerSideId;
									return (
										<div key={`result-${team.id}`} className={`rounded-lg border px-3 py-2 text-sm ${isWinnerTeam ? "border-emerald-500/50 bg-emerald-950/20" : "border-slate-700/80 bg-slate-900/70"}`}>
											<div className="flex items-center justify-between">
												<span className="font-medium text-slate-100">{team.name}</span>
												{isWinnerTeam ? (
													<Badge variant="outline" className="border-emerald-500/60 text-emerald-300">برنده</Badge>
												) : (
													<Badge variant="outline" className="border-slate-600 text-slate-300">
														{side?.name ?? `Side ${team.sideId}`}
													</Badge>
												)}
											</div>
											<div className="mt-1 text-xs text-slate-300">
												Points: {team.points} | Credits: {team.credits}
											</div>
										</div>
									);
								})}
							</div>
							<div className="mt-3 text-xs text-slate-400">
								{gameEndedSignalReceived
									? "رویداد GAME_ENDED دریافت شد و ارتباط زنده متوقف گردید."
									: "بازی در وضعیت finished قرار دارد و ارتباط زنده متوقف شده است."}
							</div>
						</div>
					) : null}

					<div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
					<section className="space-y-4">
							<Card className="border-cyan-500/25 bg-slate-950/70 backdrop-blur-md">
								<CardHeader>
									<CardTitle className="text-base text-cyan-200 flex items-center gap-2">
										<Zap className="w-4 h-4" />
										دستور عملیات
									</CardTitle>
								</CardHeader>
								<CardContent className="text-sm text-slate-300 space-y-3">
									<div className="space-y-1">
										<div>1. اکشن، هدف و آیتم بازار سیاه را انتخاب کنید.</div>
										<div>2. با دکمه ثبت، مستقیم به API `POST /client/vote_action` رأی ارسال کنید.</div>
										<div>3. تایم‌لاین لحظه‌ای و صداها را برای جریان بازی دنبال کنید.</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
										<div className="rounded border border-slate-700/80 bg-slate-900/80 px-3 py-2">
											<div className="text-[11px] text-slate-400">اکشن انتخابی</div>
											<div className="text-cyan-200 mt-1">{selectedAction?.displayName ?? selectedAction?.name ?? "—"}</div>
										</div>
										<div className="rounded border border-slate-700/80 bg-slate-900/80 px-3 py-2">
											<div className="text-[11px] text-slate-400">هدف انتخابی</div>
											<div className="text-emerald-200 mt-1">{selectedTarget?.name ?? "—"}</div>
										</div>
										<div className="rounded border border-slate-700/80 bg-slate-900/80 px-3 py-2">
											<div className="text-[11px] text-slate-400">آیتم بازار سیاه</div>
											<div className="text-violet-200 mt-1">{selectedBlackMarketItem?.name ?? "—"}</div>
										</div>
									</div>

									{voteError ? (
										<div className="rounded border border-rose-500/50 bg-rose-950/35 px-3 py-2 text-xs text-rose-200">
											{voteError}
										</div>
									) : null}
									{voteStatus ? (
										<div className="rounded border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
											<CheckCircle2 className="w-4 h-4" />
											{voteStatus}
										</div>
									) : null}

									<div className="flex flex-wrap items-center gap-2">
										<Button
											onClick={() => void submitVoteAction()}
											disabled={isSubmittingVote || !canSubmitVote}
											className="bg-cyan-700 hover:bg-cyan-600 text-white"
										>
											{isSubmittingVote ? (
												<RefreshCw className="w-4 h-4 ml-2 animate-spin" />
											) : (
												<Send className="w-4 h-4 ml-2" />
											)}
											{isSelectionPhase ? "ثبت انتخاب هدف" : "ثبت رأی اکشن"}
										</Button>
											<Button
												variant="outline"
												onClick={() => {
													if (isGameLocked) return;
													setSelectedActionId(null);
													setSelectedTargetTeamId(null);
													setSelectedBlackMarketItemId(null);
													setVoteError(null);
													setVoteStatus(null);
												}}
												disabled={isGameLocked}
												className="border-slate-600 text-slate-200"
											>
											پاک‌سازی انتخاب‌ها
										</Button>
										<span className="text-xs text-slate-400">
											فاز فعلی: {isSelectionPhase ? "انتخاب هدف (Selection)" : isVotingPhase ? "رأی‌گیری اکشن (Voting)" : phase}
										</span>
									</div>
								</CardContent>
							</Card>

						<Card className="border-rose-500/25 bg-slate-950/70 backdrop-blur-md">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2 text-rose-200">
									<Swords className="w-4 h-4" />
									کارت‌های حمله فعال
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{actionsError ? <div className="text-xs text-rose-300">{actionsError}</div> : null}
									{actions.length === 0 ? (
										<div className="text-sm text-slate-400">اکشنی برای شما فعال نشده است.</div>
									) : (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{actions.map((action) => {
												const isSelected = selectedActionId === action.id;
												return (
														<button
															type="button"
															key={action.id}
															disabled={isGameLocked}
															onClick={() => {
																if (isGameLocked) return;
																setSelectedActionId(action.id);
																void playUiSound("/sounds/computer-mouse-click-351398.mp3", 0.4);
															}}
															className={`text-right rounded-xl border p-4 transition-all ${isGameLocked ? "opacity-55 cursor-not-allowed" : "hover:scale-[1.01]"} ${isSelected ? "border-rose-400 bg-rose-950/25 shadow-[0_0_18px_rgba(244,63,94,.22)]" : "border-slate-700/90 bg-gradient-to-br from-slate-900 to-slate-950"}`}
														>
														<div className="flex items-center justify-between gap-2">
															<div className="font-semibold text-slate-100">{action.displayName ?? action.name}</div>
															<Badge variant="outline" className="border-slate-600 text-slate-200">
																{action.category}
															</Badge>
														</div>
														<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
															<div className="flex items-center gap-1">
																<Coins className="w-3.5 h-3.5" /> هزینه: {action.cost}
															</div>
															<div>شانس: {action.probability}%</div>
															<div className="col-span-2 text-slate-400">
																Counter: {action.counterActionName ?? action.counterActionId ?? "—"}
															</div>
														</div>
														<div className="mt-3 text-xs">
															<span className={isSelected ? "text-rose-200" : "text-slate-400"}>
																{isSelected ? "انتخاب شد" : "برای انتخاب لمس کنید"}
															</span>
														</div>
													</button>
												);
											})}
										</div>
									)}
								</CardContent>
							</Card>

						<Card className="border-emerald-500/25 bg-slate-950/70 backdrop-blur-md">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2 text-emerald-200">
									<Target className="w-4 h-4" />
									اهداف قابل نفوذ
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{targetsError ? <div className="text-xs text-rose-300">{targetsError}</div> : null}
									{targets.length === 0 ? (
										<div className="text-sm text-slate-400">فعلا هدفی برای تیم شما فعال نیست.</div>
									) : (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{targets.map((targetItem) => {
												const isSelected = selectedTargetTeamId === targetItem.id;
												return (
														<button
															type="button"
															key={targetItem.id}
															disabled={isGameLocked}
															onClick={() => {
																if (isGameLocked) return;
																setSelectedTargetTeamId(targetItem.id);
																void playUiSound("/sounds/computer-mouse-click-351398.mp3", 0.4);
															}}
															className={`text-right rounded-xl border p-4 transition-all ${isGameLocked ? "opacity-55 cursor-not-allowed" : ""} ${isSelected ? "border-emerald-400 bg-emerald-950/20 shadow-[0_0_18px_rgba(16,185,129,.2)]" : "border-slate-700/80 bg-slate-900/70"}`}
														>
														<div className="font-semibold text-slate-100">{targetItem.name}</div>
														<div className="text-xs text-slate-400 mt-1">
															{targetItem.sideName ?? `Side ${targetItem.sideId}`}
														</div>
														<div className="text-xs text-slate-300 mt-2">
															Points: {targetItem.points ?? 0} | Credits: {targetItem.credits ?? 0}
														</div>
														<div className={`text-xs mt-2 ${isSelected ? "text-emerald-200" : "text-slate-400"}`}>
															{isSelected ? "هدف انتخاب شد" : "برای انتخاب هدف لمس کنید"}
														</div>
													</button>
												);
											})}
										</div>
									)}
								</CardContent>
							</Card>

						<Card className="border-violet-500/25 bg-slate-950/70 backdrop-blur-md">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2 text-violet-200">
									<Clock3 className="w-4 h-4" />
									بازار سیاه
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
									{blackMarketItems.length === 0 ? (
										<div className="text-sm text-slate-400">فعلا آیتمی برای خرید وجود ندارد.</div>
									) : (
										blackMarketItems.map((item) => {
											const isSelected = selectedBlackMarketItemId === item.id;
											return (
													<button
														type="button"
														key={item.id}
														disabled={isGameLocked}
														onClick={() => {
															if (isGameLocked) return;
															setSelectedBlackMarketItemId((prev) => (prev === item.id ? null : item.id));
															void playUiSound("/sounds/computer-mouse-click-351398.mp3", 0.38);
														}}
														className={`w-full text-right rounded-lg border p-3 text-sm transition-all ${isGameLocked ? "opacity-55 cursor-not-allowed" : ""} ${isSelected ? "border-violet-400 bg-violet-950/25 shadow-[0_0_16px_rgba(139,92,246,.2)]" : "border-slate-700/80 bg-slate-900/70"}`}
													>
													<div className="font-semibold text-slate-100">{item.name}</div>
													<div className="text-xs text-slate-300 mt-1">
														Cost: {item.cost} | Type: {item.itemType ?? item.item_type ?? "—"}
													</div>
													<div className={`mt-2 text-xs ${isSelected ? "text-violet-200" : "text-slate-400"}`}>
														{isSelected ? "برای رأی بعدی فعال شد" : "برای استفاده در رأی انتخاب کنید"}
													</div>
												</button>
											);
										})
									)}
								</CardContent>
							</Card>
					</section>

					<aside className="space-y-4">
						<Card className="border-blue-500/25 bg-slate-950/70 backdrop-blur-md">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2 text-blue-200">
									<Users className="w-4 h-4" />
									وضعیت تیم‌ها
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{(gameState?.teams ?? []).map((team) => {
									const side = gameState?.sides.find((item) => item.id === team.sideId);
									const isCurrentTeam = team.id === currentTeamId;
									return (
										<div
											key={team.id}
											className={`rounded-lg border p-3 text-sm ${
												isCurrentTeam
													? "border-cyan-400/70 bg-cyan-950/25"
													: "border-slate-700/80 bg-slate-900/70"
											}`}
										>
											<div className="flex items-center justify-between">
												<div className="font-semibold">{team.name}</div>
												<Badge variant="outline" className="border-slate-600 text-slate-200">
													{side?.name ?? `Side ${team.sideId}`}
												</Badge>
											</div>
											<div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
												<div className="flex items-center gap-1">
													<Coins className="w-3.5 h-3.5" /> {team.credits}
												</div>
												<div>Points: {team.points}</div>
											</div>
										</div>
									);
								})}
							</CardContent>
						</Card>

							<Card className="border-emerald-500/25 bg-slate-950/70 backdrop-blur-md">
								<CardHeader>
									<CardTitle className="text-base flex items-center gap-2 text-emerald-200">
										<Radio className="w-4 h-4" />
										لاگ رویداد لحظه‌ای
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex items-center justify-between text-xs text-slate-400">
										<span>since={streamSinceRef.current}</span>
											<Badge
												variant="outline"
												className={
													shouldStopLiveUpdates
														? "border-slate-600 text-slate-300"
														: sseConnected
														? "border-emerald-500/60 text-emerald-300"
														: "border-slate-600 text-slate-300"
												}
											>
												{shouldStopLiveUpdates ? "متوقف" : sseConnected ? "متصل" : "غیرمتصل"}
											</Badge>
									</div>
									<div className="text-[11px] text-slate-500">
										صدا: {soundEnabled ? "فعال" : "غیرفعال"} | رویدادها به صورت تصویری نمایش داده می‌شوند.
									</div>
									{sseError ? (
										<div className="text-xs text-amber-300 flex items-center gap-1">
											<AlertTriangle className="w-3.5 h-3.5" />
											{sseError}
										</div>
									) : null}
									<ScrollArea className="h-56 rounded border border-slate-700/80 bg-slate-900/65 p-2">
										{visualEvents.length === 0 ? (
											<div className="text-xs text-slate-400 p-2">هنوز رویدادی دریافت نشده است.</div>
										) : (
											<div className="space-y-2">
												{visualEvents.map((event, index) => (
													<div
														key={event.id}
														className={`rounded border p-2 text-xs ${
															event.tone === "success"
																? "border-emerald-500/45 bg-emerald-950/20"
																: event.tone === "warning"
																	? "border-amber-500/45 bg-amber-950/20"
																	: event.tone === "danger"
																		? "border-rose-500/45 bg-rose-950/20"
																		: "border-cyan-500/35 bg-cyan-950/15"
														} ${index === 0 ? "animate-pulse" : ""}`}
													>
														<div className="flex items-center justify-between mb-1">
															<span className="font-semibold text-slate-100">{event.title}</span>
															<span className="text-slate-400">{new Date(event.receivedAt).toLocaleTimeString("fa-IR")}</span>
														</div>
														<div className="text-slate-300">{event.description}</div>
														<div className="mt-1 text-[11px] text-slate-500">{event.eventType}</div>
													</div>
												))}
											</div>
										)}
									</ScrollArea>
									<details className="rounded border border-slate-700/80 bg-slate-900/45 px-2 py-1">
										<summary className="cursor-pointer text-xs text-slate-400">JSON خام رویدادها</summary>
										<div className="mt-2 space-y-2 max-h-40 overflow-auto">
											{sseEvents.slice(0, 12).map((event) => (
												<div key={`raw-${event.id}`} className="rounded border border-slate-700/70 p-2 text-[11px] text-slate-200">
													<div className="text-slate-400 mb-1">{event.eventType}</div>
													<pre className="whitespace-pre-wrap">{JSON.stringify(event.payload, null, 2)}</pre>
												</div>
											))}
										</div>
									</details>
								</CardContent>
							</Card>

						<Card className="border-cyan-500/35 bg-slate-950/75 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,.14)]">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2 text-cyan-200">
									<Activity className="w-4 h-4" />
									چت خصوصی تیم
								</CardTitle>
									<div className="text-xs text-slate-400">
										فقط اعضای تیم «{currentTeam?.name ?? "نامشخص"}» پیام‌ها را می‌بینند.
									</div>
									{isGameLocked ? (
										<div className="text-xs text-amber-300">
											بازی پایان یافته است؛ ارسال پیام جدید غیرفعال شد.
										</div>
									) : null}
								</CardHeader>
							<CardContent className="space-y-2">
								{chatError ? (
									<div className="text-xs text-amber-300 flex items-center gap-1">
										<AlertTriangle className="w-3.5 h-3.5" />
										{chatError}
									</div>
								) : null}
								<ScrollArea className="h-64 rounded border border-slate-700/80 bg-slate-900/60 p-2">
									{chatMessages.length === 0 ? (
										<div className="text-xs text-slate-400 p-2">
											هنوز پیامی در چت تیم ثبت نشده است.
										</div>
									) : (
										<div className="space-y-2">
											{chatMessages.map((message) => {
												const mine =
													currentPlayerId !== null && message.senderId === currentPlayerId;
												return (
													<div
														key={message.id}
														className={`rounded-lg p-2 text-xs border ${
															mine
																? "border-cyan-500/45 bg-cyan-950/30"
																: "border-slate-700/80 bg-slate-900/70"
														}`}
													>
														<div className="flex items-center justify-between text-slate-400">
															<span>{mine ? "شما" : message.senderName}</span>
															<span>{new Date(message.createdAt).toLocaleTimeString("fa-IR")}</span>
														</div>
														<div className="mt-1 text-slate-100 whitespace-pre-wrap">{message.text}</div>
													</div>
												);
											})}
										</div>
									)}
								</ScrollArea>

								<div className="flex gap-2">
										<Input
											value={chatDraft}
											onChange={(event) => setChatDraft(event.target.value)}
											disabled={isGameLocked}
											onKeyDown={(event) => {
												if (isGameLocked) {
													event.preventDefault();
													return;
												}
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													void handleSendChat();
												}
											}}
											placeholder="پیام تاکتیکی برای تیم خود بنویسید..."
											className="bg-slate-900/90 border-slate-700 text-slate-100"
											dir="rtl"
										/>
										<Button
											onClick={() => void handleSendChat()}
											disabled={isGameLocked || isSendingChat || !chatDraft.trim() || currentTeamId === null}
											className="bg-cyan-700 hover:bg-cyan-600 text-white"
										>
										<Send className={`w-4 h-4 ${isSendingChat ? "animate-pulse" : ""}`} />
									</Button>
								</div>
							</CardContent>
						</Card>
					</aside>
				</div>

				<div className="mt-4 text-xs text-slate-500 text-center">
					آخرین بروزرسانی: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("fa-IR") : "—"}
				</div>
			</div>

			{isInitialLoading ? (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="rounded-lg border border-slate-700 bg-slate-900/90 px-6 py-4 text-sm text-slate-200 flex items-center gap-2">
						<RefreshCw className="w-4 h-4 animate-spin" />
						در حال دریافت اطلاعات بازی...
					</div>
				</div>
			) : null}
		</div>
	);
}
