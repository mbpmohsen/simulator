import type {
	EventStatusData,
	GameEvent,
	GovernmentOrderIssuedEvent,
	ScenarioStepResolvedEvent,
} from "@workspace/trpc";
import { createRuntimeHttpError } from "@/lib/apiErrorParser";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;

export const parseGameEvent = (
	value: unknown,
	eventType?: string,
	eventId?: string,
): GameEvent | null => {
	const record = asRecord(value);
	if (!record) return null;
	const payload = asRecord(record.payload) ?? {};
	const seqCandidate = record.seq ?? eventId;
	const seq =
		typeof seqCandidate === "number" ? seqCandidate : Number(seqCandidate);
	const type = typeof record.type === "string" ? record.type : eventType;
	if (!Number.isFinite(seq) || !type) return null;
	const gameId = record.gameId ?? record.game_id;
	const createdAt = record.createdAt ?? record.created_at;
	return {
		...record,
		seq,
		type,
		gameId: typeof gameId === "string" ? gameId : "",
		visibility: (asRecord(record.visibility) as GameEvent["visibility"]) ?? {
			scope: "subscriber",
		},
		payload,
		createdAt:
			typeof createdAt === "string" ? createdAt : new Date().toISOString(),
	} as GameEvent;
};

export const isScenarioStepResolvedEvent = (
	event: GameEvent,
): event is ScenarioStepResolvedEvent =>
	event.type === "SCENARIO_STEP_RESOLVED";

export const isGovernmentOrderIssuedEvent = (
	event: GameEvent,
): event is GovernmentOrderIssuedEvent =>
	event.type === "GOVERNMENT_ORDER_ISSUED";

export interface ParsedSseBuffer {
	events: GameEvent[];
	remainder: string;
}

export const parseSseBuffer = (buffer: string): ParsedSseBuffer => {
	const normalized = buffer.replace(/\r\n/g, "\n");
	const blocks = normalized.split("\n\n");
	const remainder = blocks.pop() ?? "";
	const events: GameEvent[] = [];
	for (const block of blocks) {
		let eventType = "message";
		let eventId = "";
		const dataLines: string[] = [];
		for (const line of block.split("\n")) {
			if (line.startsWith(":")) continue;
			if (line.startsWith("event:")) eventType = line.slice(6).trim();
			else if (line.startsWith("id:")) eventId = line.slice(3).trim();
			else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
		}
		if (eventType.toLowerCase() === "keepalive" || dataLines.length === 0) {
			continue;
		}
		try {
			const event = parseGameEvent(
				JSON.parse(dataLines.join("\n")) as unknown,
				eventType,
				eventId,
			);
			if (event) events.push(event);
		} catch {
			// One malformed event must not terminate the stream.
		}
	}
	return { events, remainder };
};

export interface EventHistoryQuery {
	sinceSeq: number;
	limit?: number;
	types?: string[];
}

export interface GameEventsApi {
	getStatus(gameId: string, signal: AbortSignal): Promise<EventStatusData>;
	getHistory(
		gameId: string,
		query: EventHistoryQuery,
		signal: AbortSignal,
	): Promise<GameEvent[]>;
	openStream(
		gameId: string,
		since: number,
		signal: AbortSignal,
	): Promise<Response>;
}

export const createGameEventsApi = (token: string): GameEventsApi => {
	const headers = { Authorization: `Bearer ${token}` };
	return {
		async getStatus(gameId, signal) {
			const response = await fetch(
				`${BASE_URL}/api/games/${encodeURIComponent(gameId)}/events/status`,
				{ headers, signal },
			);
			if (!response.ok) {
				throw await createRuntimeHttpError(
					response,
					"دریافت وضعیت رویدادها ناموفق بود.",
				);
			}
			const root = asRecord(await response.json());
			const data = asRecord(root?.data);
			return {
				gameId: typeof data?.gameId === "string" ? data.gameId : gameId,
				currentSeq: Number(data?.currentSeq ?? 0),
				eventCount: Number(data?.eventCount ?? 0),
				streamEndpoint:
					typeof data?.streamEndpoint === "string" ? data.streamEndpoint : "",
				replayEndpoint:
					typeof data?.replayEndpoint === "string" ? data.replayEndpoint : "",
			};
		},
		async getHistory(gameId, query, signal) {
			const params = new URLSearchParams({
				since_seq: String(query.sinceSeq),
				limit: String(query.limit ?? 100),
			});
			if (query.types?.length) params.set("types", query.types.join(","));
			const response = await fetch(
				`${BASE_URL}/api/games/${encodeURIComponent(gameId)}/events?${params.toString()}`,
				{ headers, signal },
			);
			if (!response.ok) {
				throw await createRuntimeHttpError(
					response,
					"دریافت تاریخچه رویدادها ناموفق بود.",
				);
			}
			const root = asRecord(await response.json());
			const data = asRecord(root?.data);
			return Array.isArray(data?.events)
				? data.events.flatMap((item) => parseGameEvent(item) ?? [])
				: [];
		},
		async openStream(gameId, since, signal) {
			const params = new URLSearchParams({ since: String(since) });
			const response = await fetch(
				`${BASE_URL}/api/games/${encodeURIComponent(gameId)}/events/stream?${params.toString()}`,
				{
					headers: { ...headers, Accept: "text/event-stream" },
					signal,
				},
			);
			if (!response.ok || !response.body) {
				throw await createRuntimeHttpError(
					response,
					"اتصال رویدادهای زنده برقرار نشد.",
				);
			}
			return response;
		},
	};
};
