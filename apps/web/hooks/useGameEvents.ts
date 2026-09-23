"use client";

import { type GameEvent, isTerminalGameEvent } from "@workspace/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { createGameEventsApi, parseSseBuffer } from "@/lib/gameEventsApi";

const MAX_EVENTS = 100;
const RECONNECT_MS = 3000;
const POLL_MS = 6000;

export type GameEventsStatus =
	| "idle"
	| "connecting"
	| "live"
	| "polling"
	| "ended"
	| "error";

export interface GameEventsState {
	/** Events worth showing a person. Sync traffic is filtered out. */
	events: GameEvent[];
	status: GameEventsStatus;
	error: string | null;
	/**
	 * Seq of the latest GAME_STATE_SNAPSHOT. The snapshot is a periodic ping: it
	 * means nothing to a player, but pages use it as a cue to re-read state.
	 */
	snapshotSeq: number;
	/**
	 * The latest snapshot's payload. It is never rendered as an event, but it
	 * carries fields the REST endpoints leave out - the phase clock among them.
	 */
	snapshot: Record<string, unknown> | null;
}

/**
 * Connection and sync traffic. It is never shown in a feed, and it is kept
 * out of `events` for two more reasons: it would fill the 100-event buffer and
 * push out real events, and as the newest event it would hide the real one
 * that pages react to (a step resolving, a turn ending).
 */
const SYNC_EVENT_TYPES = new Set([
	"GAME_STATE_SNAPSHOT",
	"USER_HEARTBEAT",
	"USER_STREAM_CONNECTED",
	"USER_STREAM_DISCONNECTED",
]);

export const isSyncGameEvent = (event: Pick<GameEvent, "type">): boolean =>
	SYNC_EVENT_TYPES.has(String(event.type).toUpperCase());

const mergeEvents = (
	current: GameEvent[],
	incoming: GameEvent[],
): GameEvent[] => {
	const bySeq = new Map(current.map((event) => [event.seq, event]));
	for (const event of incoming) bySeq.set(event.seq, event);
	return [...bySeq.values()]
		.sort((first, second) => second.seq - first.seq)
		.slice(0, MAX_EVENTS);
};

export const useGameEvents = (
	gameId: string | null,
	token: string | null,
	enabled = true,
): GameEventsState => {
	const api = useMemo(() => createGameEventsApi(token ?? ""), [token]);
	const [state, setState] = useState<GameEventsState>({
		events: [],
		status: "idle",
		error: null,
		snapshotSeq: 0,
		snapshot: null,
	});
	const sinceRef = useRef(0);

	useEffect(() => {
		sinceRef.current = 0;
		setState({
			events: [],
			status: gameId && token ? (enabled ? "connecting" : "ended") : "idle",
			error: null,
			snapshotSeq: 0,
			snapshot: null,
		});
		if (!gameId || !token || !enabled) return;

		let active = true;
		let connecting = false;
		let terminal = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let pollTimer: ReturnType<typeof setInterval> | null = null;
		const controller = new AbortController();

		const addEvents = (events: GameEvent[]): void => {
			if (!active || events.length === 0) return;
			terminal = terminal || events.some(isTerminalGameEvent);
			sinceRef.current = Math.max(
				sinceRef.current,
				...events.map((event) => event.seq),
			);
			const visible = events.filter((event) => !isSyncGameEvent(event));
			let snapshotPayload: Record<string, unknown> | null = null;
			const snapshotSeq = events.reduce((max, event) => {
				if (String(event.type).toUpperCase() !== "GAME_STATE_SNAPSHOT") {
					return max;
				}
				if (event.seq >= max) {
					snapshotPayload = event.payload as Record<string, unknown>;
				}
				return Math.max(max, event.seq);
			}, 0);
			if (visible.length === 0 && snapshotSeq === 0) return;
			setState((current) => ({
				...current,
				events:
					visible.length > 0
						? mergeEvents(current.events, visible)
						: current.events,
				snapshotSeq: Math.max(current.snapshotSeq, snapshotSeq),
				snapshot:
					snapshotSeq >= current.snapshotSeq && snapshotPayload
						? snapshotPayload
						: current.snapshot,
				status: terminal ? "ended" : current.status,
				error: terminal ? null : current.error,
			}));
		};

		const loadStatus = async (): Promise<void> => {
			const status = await api.getStatus(gameId, controller.signal);
			if (status.currentSeq < sinceRef.current) sinceRef.current = 0;
		};

		const loadHistory = async (): Promise<void> => {
			const events = await api.getHistory(
				gameId,
				{ sinceSeq: sinceRef.current, limit: 100 },
				controller.signal,
			);
			addEvents(events);
		};

		const poll = async (): Promise<void> => {
			try {
				await loadHistory();
				if (terminal) {
					stopPolling();
					setState((current) => ({ ...current, status: "ended", error: null }));
					return;
				}
				if (active)
					setState((current) => ({
						...current,
						status: "polling",
						error: null,
					}));
			} catch (requestError) {
				if (!active || controller.signal.aborted) return;
				setState((current) => ({
					...current,
					status: "error",
					error: parseRuntimeApiError(
						requestError,
						"دریافت رویدادها ناموفق بود.",
					).message,
				}));
			}
		};

		const startPolling = (): void => {
			if (pollTimer) return;
			void poll();
			pollTimer = setInterval(() => void poll(), POLL_MS);
		};

		const stopPolling = (): void => {
			if (!pollTimer) return;
			clearInterval(pollTimer);
			pollTimer = null;
		};

		const scheduleReconnect = (connect: () => Promise<void>): void => {
			if (!active || reconnectTimer) return;
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				void connect();
			}, RECONNECT_MS);
		};

		const connect = async (): Promise<void> => {
			if (!active || connecting) return;
			connecting = true;
			setState((current) => ({ ...current, status: "connecting" }));
			try {
				await loadStatus();
				await loadHistory();
				if (terminal) {
					setState((current) => ({ ...current, status: "ended", error: null }));
					return;
				}
				const response = await api.openStream(
					gameId,
					sinceRef.current,
					controller.signal,
				);
				if (!response.body) throw new Error("پاسخ جریان رویداد خالی است.");
				stopPolling();
				setState((current) => ({ ...current, status: "live", error: null }));
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				while (active) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const parsed = parseSseBuffer(buffer);
					buffer = parsed.remainder;
					addEvents(parsed.events);
					if (terminal) {
						await reader.cancel();
						break;
					}
				}
				if (active && !terminal) {
					startPolling();
					scheduleReconnect(connect);
				}
			} catch (requestError) {
				if (!active || controller.signal.aborted) return;
				setState((current) => ({
					...current,
					status: "polling",
					error: parseRuntimeApiError(
						requestError,
						"اتصال زنده قطع شد؛ بازیابی دوره‌ای فعال است.",
					).message,
				}));
				startPolling();
				scheduleReconnect(connect);
			} finally {
				connecting = false;
			}
		};

		void connect();
		return () => {
			active = false;
			controller.abort();
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (pollTimer) clearInterval(pollTimer);
		};
	}, [api, enabled, gameId, token]);

	return state;
};
