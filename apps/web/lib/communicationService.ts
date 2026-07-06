import type {
	CommunicationMessage,
	CommunicationPermissionOptions,
	CommunicationSendInput,
	CommunicationService,
	CommunicationViewer,
	GamePhase,
	TeamRoleType,
} from "@workspace/trpc";
import {
	canSendCommunication,
	isCommunicationVisibleToViewer,
	isSimulationCommunication,
} from "@workspace/trpc";

export interface CommunicationServiceOptions {
	token: string;
	gameId: string;
	senderUserId: number;
	senderTeamId: number;
	senderSideId?: number;
	senderRole: TeamRoleType | "ADMIN";
	turn: number;
	phase?: GamePhase;
	permissions?: CommunicationPermissionOptions;
	ownSideTeamIds?: number[];
}

const EVENT_NAME = "simulator-local-communication";
const bus = typeof window === "undefined" ? null : new EventTarget();
const storageKey = (gameId: string): string =>
	`simulator-communication:${gameId}`;
const hiddenStorageKey = (gameId: string, userId: number): string =>
	`simulator-communication-hidden:${gameId}:${userId}`;
const reportStorageKey = (gameId: string, userId: number): string =>
	`simulator-communication-reports:${gameId}:${userId}`;

const isCommunicationMessage = (
	value: unknown,
): value is CommunicationMessage => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.game_id === "string" &&
		typeof candidate.type === "string" &&
		typeof candidate.body === "string" &&
		typeof candidate.sender_user_id === "number" &&
		(candidate.sender_team_id === null ||
			candidate.sender_team_id === undefined ||
			typeof candidate.sender_team_id === "number") &&
		typeof candidate.created_at === "string"
	);
};

const readJsonArray = (key: string): unknown[] => {
	if (typeof window === "undefined") return [];
	const raw = window.localStorage.getItem(key);
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const readLocalMessages = (gameId: string): CommunicationMessage[] =>
	readJsonArray(storageKey(gameId)).filter(isCommunicationMessage);

const writeLocalMessages = (
	gameId: string,
	messages: CommunicationMessage[],
): void => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		storageKey(gameId),
		JSON.stringify(messages.slice(-200)),
	);
};

const readHiddenIds = (gameId: string, userId: number): Set<string> =>
	new Set(
		readJsonArray(hiddenStorageKey(gameId, userId)).filter(
			(value): value is string => typeof value === "string",
		),
	);

const viewerFromOptions = (
	options: CommunicationServiceOptions,
): CommunicationViewer => ({
	userId: options.senderUserId,
	teamId: options.senderTeamId,
	sideId: options.senderSideId,
	role: options.senderRole,
});

const validateAudience = (
	input: CommunicationSendInput,
	options: CommunicationServiceOptions,
): void => {
	if (
		!canSendCommunication(options.senderRole, input.type, options.permissions)
	) {
		throw new Error("برای ارسال این نوع پیام دسترسی ندارید.");
	}
	const targetId = input.audience.id;
	const targetNumericId =
		targetId === null || targetId === undefined ? null : Number(targetId);
	if (input.type === "TEAM_CHAT") {
		if (
			input.audience.type !== "team" ||
			targetNumericId !== options.senderTeamId
		) {
			throw new Error("گفت‌وگوی بازیکن فقط برای تیم خودی مجاز است.");
		}
		return;
	}
	if (input.type === "GOVERNMENT_TO_OWN_TEAM") {
		if (input.audience.type !== "team" || !targetNumericId) {
			throw new Error("تیم خودی مقصد را انتخاب کنید.");
		}
		if (
			options.ownSideTeamIds?.length &&
			!options.ownSideTeamIds.includes(targetNumericId)
		) {
			throw new Error("تیم مقصد باید در سمت خودی باشد.");
		}
		return;
	}
	if (input.type === "GOVERNMENT_TO_ALLIED_SIDE") {
		if (
			input.audience.type !== "side" ||
			targetNumericId !== options.senderSideId
		) {
			throw new Error("پیام سمت خودی باید فقط به سمت دولت فرستنده ارسال شود.");
		}
		return;
	}
	if (input.type === "GOVERNMENT_TO_ENEMY_GOVERNMENT") {
		if (input.audience.type !== "government" || !targetNumericId) {
			throw new Error("شناسه دولت حریف را وارد کنید.");
		}
		if (targetNumericId === options.senderTeamId) {
			throw new Error("دولت مقصد باید با دولت فرستنده متفاوت باشد.");
		}
		return;
	}
	if (input.type === "GOVERNMENT_TO_ENEMY_TEAM") {
		if (input.audience.type !== "team" || !targetNumericId) {
			throw new Error("شناسه تیم حریف را وارد کنید.");
		}
		if (
			targetNumericId === options.senderTeamId ||
			options.ownSideTeamIds?.includes(targetNumericId)
		) {
			throw new Error(
				"برای این کانال باید یک تیم خارج از سمت خودی انتخاب شود.",
			);
		}
		return;
	}
	if (input.type === "PUBLIC_ANNOUNCEMENT" && input.audience.type !== "all") {
		throw new Error("اطلاعیه عمومی باید برای همه ارسال شود.");
	}
	if (isSimulationCommunication(input.type) && input.audience.type !== "all") {
		throw new Error("پیام شبیه‌سازی باید در کانال عمومی درون‌بازی منتشر شود.");
	}
};

export const createLocalCommunicationService = (
	options: CommunicationServiceOptions,
): CommunicationService => {
	const viewer = viewerFromOptions(options);
	return {
		mode: "mock",
		capabilities: {
			realtime: true,
			hide: true,
			report: true,
			moderate: false,
			export: false,
		},
		async listMessages(params) {
			const hiddenIds = readHiddenIds(params.gameId, options.senderUserId);
			const since = params.since ? Date.parse(params.since) : Number.NaN;
			return readLocalMessages(params.gameId)
				.filter((message) => isCommunicationVisibleToViewer(message, viewer))
				.filter((message) => !hiddenIds.has(message.id))
				.filter(
					(message) => !params.roomId || message.room_id === params.roomId,
				)
				.filter(
					(message) =>
						Number.isNaN(since) || Date.parse(message.created_at) > since,
				)
				.slice(-(params.limit ?? 100));
		},
		async sendMessage(input) {
			if (input.gameId !== options.gameId) {
				throw new Error("شناسه بازی پیام با نشست فعال هماهنگ نیست.");
			}
			const body = input.body.trim();
			if (!body) throw new Error("متن پیام خالی است.");
			if (body.length > 1000) {
				throw new Error("متن پیام نباید بیشتر از ۱۰۰۰ نویسه باشد.");
			}
			validateAudience(input, options);
			const message: CommunicationMessage = {
				id: crypto.randomUUID(),
				game_id: input.gameId,
				room_id: input.roomId,
				turn: options.turn,
				phase: options.phase,
				type: input.type,
				sender_user_id: options.senderUserId,
				sender_team_id: options.senderTeamId,
				sender_side_id: options.senderSideId,
				sender_role: options.senderRole,
				audience: input.audience,
				body,
				simulation_label: isSimulationCommunication(input.type),
				related_subject_id: input.related_subject_id,
				related_sub_subject_id: input.related_sub_subject_id,
				related_scenario_id: input.related_scenario_id,
				related_step_id: input.related_step_id,
				related_event_seq: input.related_event_seq,
				created_at: new Date().toISOString(),
				status: "sent",
			};
			writeLocalMessages(input.gameId, [
				...readLocalMessages(input.gameId),
				message,
			]);
			bus?.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: message }));
			return message;
		},
		subscribeMessages({ gameId, roomId, onMessage }) {
			if (!bus || typeof window === "undefined") return () => undefined;
			const knownIds = new Set(
				readLocalMessages(gameId).map((message) => message.id),
			);
			const deliver = (message: CommunicationMessage): void => {
				if (
					message.game_id !== gameId ||
					(roomId && message.room_id !== roomId) ||
					knownIds.has(message.id) ||
					!isCommunicationVisibleToViewer(message, viewer)
				) {
					return;
				}
				knownIds.add(message.id);
				onMessage(message);
			};
			const localListener = (event: Event): void => {
				const message = (event as CustomEvent<CommunicationMessage>).detail;
				deliver(message);
			};
			const storageListener = (event: StorageEvent): void => {
				if (event.key !== storageKey(gameId) || !event.newValue) return;
				try {
					const parsed: unknown = JSON.parse(event.newValue);
					if (!Array.isArray(parsed)) return;
					for (const message of parsed.filter(isCommunicationMessage)) {
						deliver(message);
					}
				} catch {
					return;
				}
			};
			bus.addEventListener(EVENT_NAME, localListener);
			window.addEventListener("storage", storageListener);
			return () => {
				bus.removeEventListener(EVENT_NAME, localListener);
				window.removeEventListener("storage", storageListener);
			};
		},
		async hideMessage(messageId) {
			if (typeof window === "undefined") return;
			const key = hiddenStorageKey(options.gameId, options.senderUserId);
			const hiddenIds = readHiddenIds(options.gameId, options.senderUserId);
			hiddenIds.add(messageId);
			window.localStorage.setItem(key, JSON.stringify([...hiddenIds]));
		},
		async reportMessage(messageId, reason) {
			if (typeof window === "undefined") return;
			const key = reportStorageKey(options.gameId, options.senderUserId);
			const reports = readJsonArray(key);
			window.localStorage.setItem(
				key,
				JSON.stringify([
					...reports,
					{
						message_id: messageId,
						reason: reason?.trim() || "گزارش کاربر",
						created_at: new Date().toISOString(),
					},
				]),
			);
		},
	};
};

export const createCommunicationService = (
	options: CommunicationServiceOptions,
	backend?: CommunicationService,
): CommunicationService =>
	backend ??
	(process.env.NEXT_PUBLIC_COMMUNICATION_MODE === "mock"
		? createLocalCommunicationService(options)
		: createServerCommunicationService(options));

export const COMMUNICATION_BACKEND_NOTICE =
	"حالت توسعه محلی فعال است؛ پیام‌ها فقط برای آزمایش رابط کاربری در همین مرورگر نگه‌داری می‌شوند.";

export const COMMUNICATION_CONNECTION_ERROR =
	"اتصال پیام‌رسانی برقرار نیست. دوباره تلاش کنید.";

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const getCommunicationError = async (response: Response): Promise<Error> => {
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		body = null;
	}
	const root = asRecord(body);
	const detail = asRecord(root?.detail);
	const message =
		(typeof detail?.detail === "string" && detail.detail) ||
		(typeof root?.detail === "string" && root.detail) ||
		COMMUNICATION_CONNECTION_ERROR;
	return new Error(message);
};

export const createServerCommunicationService = (
	options: CommunicationServiceOptions,
): CommunicationService => {
	const headers = {
		Authorization: `Bearer ${options.token}`,
		"Content-Type": "application/json",
	};
	const list = async (params: {
		gameId: string;
		roomId?: string;
		since?: string;
		limit?: number;
	}): Promise<CommunicationMessage[]> => {
		const query = new URLSearchParams({
			gameId: params.gameId,
			limit: String(params.limit ?? 100),
		});
		if (params.roomId) query.set("roomId", params.roomId);
		if (params.since) query.set("since", params.since);
		const response = await fetch(`/api/communication/messages?${query}`, {
			headers,
			cache: "no-store",
		});
		if (!response.ok) throw await getCommunicationError(response);
		const body: unknown = await response.json();
		if (!Array.isArray(body)) throw new Error(COMMUNICATION_CONNECTION_ERROR);
		return body.filter(isCommunicationMessage);
	};

	return {
		mode: "real",
		capabilities: {
			realtime: true,
			hide: false,
			report: false,
			moderate: false,
			export: false,
		},
		listMessages: list,
		async sendMessage(input) {
			const response = await fetch("/api/communication/messages", {
				method: "POST",
				headers,
				body: JSON.stringify(input),
			});
			if (!response.ok) throw await getCommunicationError(response);
			const body: unknown = await response.json();
			if (!isCommunicationMessage(body)) {
				throw new Error(COMMUNICATION_CONNECTION_ERROR);
			}
			return body;
		},
		subscribeMessages({ gameId, roomId, onMessage, onError }) {
			let active = true;
			let timer: ReturnType<typeof setTimeout> | null = null;
			let since = new Date().toISOString();
			const seenIds = new Set<string>();
			const poll = async (): Promise<void> => {
				try {
					const messages = await list({ gameId, roomId, since, limit: 100 });
					for (const message of messages) {
						if (seenIds.has(message.id)) continue;
						seenIds.add(message.id);
						onMessage(message);
					}
					const latest = messages.at(-1)?.created_at;
					if (latest) since = latest;
				} catch (error) {
					onError?.(
						error instanceof Error
							? error
							: new Error(COMMUNICATION_CONNECTION_ERROR),
					);
				} finally {
					if (active) timer = setTimeout(() => void poll(), 2500);
				}
			};
			timer = setTimeout(() => void poll(), 2500);
			return () => {
				active = false;
				if (timer) clearTimeout(timer);
			};
		},
	};
};
