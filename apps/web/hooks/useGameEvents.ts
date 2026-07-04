"use client";

import type { GameEvent } from "@workspace/trpc";
import { useEffect, useRef, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";
const MAX_EVENTS = 100;

type ConnectionStatus = "idle" | "connecting" | "live" | "polling" | "error";

interface GameEventsState {
	events: GameEvent[];
	status: ConnectionStatus;
	error: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;

const parseGameEvent = (
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
	return {
		...record,
		seq,
		type,
		gameId: typeof record.gameId === "string" ? record.gameId : "",
		visibility: (asRecord(record.visibility) as GameEvent["visibility"]) ?? {
			scope: "subscriber",
		},
		payload,
		createdAt:
			typeof record.createdAt === "string"
				? record.createdAt
				: new Date().toISOString(),
	} as GameEvent;
};

const mergeEvents = (
	current: GameEvent[],
	incoming: GameEvent[],
): GameEvent[] => {
	const bySeq = new Map(current.map((event) => [event.seq, event]));
	for (const event of incoming) bySeq.set(event.seq, event);
	return [...bySeq.values()].sort((a, b) => b.seq - a.seq).slice(0, MAX_EVENTS);
};

export const useGameEvents = (
	gameId: string | null,
	token: string | null,
): GameEventsState => {
	const [state, setState] = useState<GameEventsState>({
		events: [],
		status: "idle",
		error: null,
	});
	const sinceRef = useRef(0);

	useEffect(() => {
		if (!gameId || !token) {
			setState({ events: [], status: "idle", error: null });
			return;
		}
		let active = true;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let pollTimer: ReturnType<typeof setInterval> | null = null;
		const controller = new AbortController();

		const addEvents = (events: GameEvent[]): void => {
			if (!active || events.length === 0) return;
			sinceRef.current = Math.max(
				sinceRef.current,
				...events.map((event) => event.seq),
			);
			setState((current) => ({
				...current,
				events: mergeEvents(current.events, events),
			}));
		};

		const poll = async (): Promise<void> => {
			try {
				const response = await fetch(
					`${BASE_URL}/api/games/${encodeURIComponent(gameId)}/events?since_seq=${sinceRef.current}&limit=100`,
					{
						headers: { Authorization: `Bearer ${token}` },
						signal: controller.signal,
					},
				);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const root = asRecord(await response.json());
				const data = asRecord(root?.data);
				const events = Array.isArray(data?.events)
					? data.events.flatMap((event) => parseGameEvent(event) ?? [])
					: [];
				addEvents(events);
				if (active)
					setState((current) => ({
						...current,
						status: "polling",
						error: null,
					}));
			} catch (error) {
				if (active && !controller.signal.aborted)
					setState((current) => ({
						...current,
						status: "error",
						error:
							error instanceof Error
								? error.message
								: "دریافت رویدادها ناموفق بود.",
					}));
			}
		};

		const startPolling = (): void => {
			if (pollTimer) return;
			void poll();
			pollTimer = setInterval(() => void poll(), 6000);
		};

		const connect = async (): Promise<void> => {
			if (!active) return;
			setState((current) => ({
				...current,
				status: "connecting",
				error: null,
			}));
			try {
				const response = await fetch(
					`${BASE_URL}/api/games/${encodeURIComponent(gameId)}/events/stream?since=${sinceRef.current}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "text/event-stream",
						},
						signal: controller.signal,
					},
				);
				if (!response.ok || !response.body)
					throw new Error(`SSE HTTP ${response.status}`);
				if (active)
					setState((current) => ({ ...current, status: "live", error: null }));
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				while (active) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const blocks = buffer.split("\n\n");
					buffer = blocks.pop() ?? "";
					for (const block of blocks) {
						let eventType = "message";
						let eventId = "";
						const dataLines: string[] = [];
						for (const line of block.split("\n")) {
							if (line.startsWith("event:")) eventType = line.slice(6).trim();
							else if (line.startsWith("id:")) eventId = line.slice(3).trim();
							else if (line.startsWith("data:"))
								dataLines.push(line.slice(5).trim());
						}
						if (eventType === "keepalive" || dataLines.length === 0) continue;
						try {
							const event = parseGameEvent(
								JSON.parse(dataLines.join("\n")) as unknown,
								eventType,
								eventId,
							);
							if (event) addEvents([event]);
						} catch {
							// Ignore malformed individual events and keep the stream alive.
						}
					}
				}
				if (active) reconnectTimer = setTimeout(() => void connect(), 3000);
			} catch (error) {
				if (!active || controller.signal.aborted) return;
				setState((current) => ({
					...current,
					status: "polling",
					error: error instanceof Error ? error.message : null,
				}));
				startPolling();
			}
		};

		void connect();
		return () => {
			active = false;
			controller.abort();
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (pollTimer) clearInterval(pollTimer);
		};
	}, [gameId, token]);

	return state;
};
