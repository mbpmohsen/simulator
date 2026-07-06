"use client";

import type { GameEvent } from "@workspace/trpc";
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
	| "error";

export interface GameEventsState {
	events: GameEvent[];
	status: GameEventsStatus;
	error: string | null;
}

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
): GameEventsState => {
	const api = useMemo(() => createGameEventsApi(token ?? ""), [token]);
	const [state, setState] = useState<GameEventsState>({
		events: [],
		status: "idle",
		error: null,
	});
	const sinceRef = useRef(0);

	useEffect(() => {
		sinceRef.current = 0;
		setState({
			events: [],
			status: gameId && token ? "connecting" : "idle",
			error: null,
		});
		if (!gameId || !token) return;

		let active = true;
		let connecting = false;
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
				await loadHistory();
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
				}
				if (active) {
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
	}, [api, gameId, token]);

	return state;
};
