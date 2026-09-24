"use client";

import type { GameEvent } from "@workspace/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { createGameEventsApi } from "@/lib/gameEventsApi";

/**
 * The game's whole event history, for the end-of-game report.
 *
 * The live hook (`useGameEvents`) keeps a rolling 100-event buffer, which is
 * the right thing for a feed and the wrong thing for a summary: a player who
 * refreshes at the final whistle would get the last hundred events — mostly
 * snapshot pings — and a report full of holes.
 *
 * So this fetches from sequence zero and pages to the end, asking the server
 * for only the event types the report reads. The snapshot ping dominates the
 * stream (93 of 120 events in a captured six-turn game), and filtering it out
 * server-side is the difference between four pages and forty.
 *
 * If the server ignores or rejects the `types` filter, the unfiltered history
 * is fetched instead and filtered here — slower, same result.
 */

/** Everything the report reads. Anything else is noise for this purpose. */
const REPORT_EVENT_TYPES = [
	"TEAM_ACTION_RESOLVED",
	"SCENARIO_STEP_RESOLVED",
	"GOVERNMENT_ORDER_ISSUED",
];

const PAGE_SIZE = 200;
/** A six-turn game is a few dozen events; this is a runaway guard, not a limit. */
const MAX_PAGES = 40;

export interface GameHistoryState {
	events: GameEvent[];
	loading: boolean;
	error: string | null;
	/** True when paging stopped at the guard rather than at the end. */
	truncated: boolean;
}

export function useGameHistory(
	gameId: string | null,
	token: string | null,
	enabled = true,
): GameHistoryState & { reload: () => void } {
	const api = useMemo(() => createGameEventsApi(token ?? ""), [token]);
	const [state, setState] = useState<GameHistoryState>({
		events: [],
		loading: false,
		error: null,
		truncated: false,
	});
	const [nonce, setNonce] = useState(0);
	const reload = useCallback(() => setNonce((value) => value + 1), []);
	const activeRef = useRef(true);

	// `nonce` is not read in the body - it exists only so that `reload()` can
	// re-run this effect. Removing it, as the rule suggests, would make the
	// reload button do nothing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reload trigger
	useEffect(() => {
		activeRef.current = true;
		const controller = new AbortController();
		if (!gameId || !token || !enabled) {
			setState({ events: [], loading: false, error: null, truncated: false });
			return () => controller.abort();
		}

		const collect = async (types?: string[]): Promise<GameEvent[]> => {
			const collected: GameEvent[] = [];
			let since = 0;
			for (let page = 0; page < MAX_PAGES; page += 1) {
				const batch = await api.getHistory(
					gameId,
					{ sinceSeq: since, limit: PAGE_SIZE, types },
					controller.signal,
				);
				if (batch.length === 0) return collected;
				collected.push(...batch);
				const newest = batch.reduce(
					(max, event) => Math.max(max, event.seq),
					since,
				);
				// A page that does not advance the cursor would loop forever.
				if (newest <= since) return collected;
				since = newest;
				if (batch.length < PAGE_SIZE) return collected;
			}
			return collected;
		};

		const run = async (): Promise<void> => {
			setState((current) => ({ ...current, loading: true, error: null }));
			try {
				let events: GameEvent[] = [];
				let truncated = false;
				try {
					events = await collect(REPORT_EVENT_TYPES);
				} catch {
					// The filter is the optimisation, not the contract.
					const all = await collect();
					events = all.filter((event) =>
						REPORT_EVENT_TYPES.includes(event.type),
					);
					truncated = all.length >= PAGE_SIZE * MAX_PAGES;
				}
				if (!activeRef.current) return;
				const seen = new Set<number>();
				const unique = events
					.filter((event) => {
						if (seen.has(event.seq)) return false;
						seen.add(event.seq);
						return true;
					})
					.sort((left, right) => left.seq - right.seq);
				setState({
					events: unique,
					loading: false,
					error: null,
					truncated,
				});
			} catch (error) {
				if (!activeRef.current || controller.signal.aborted) return;
				setState({
					events: [],
					loading: false,
					error: parseRuntimeApiError(error, "تاریخچهٔ بازی دریافت نشد.")
						.message,
					truncated: false,
				});
			}
		};

		void run();
		return () => {
			activeRef.current = false;
			controller.abort();
		};
	}, [api, gameId, token, enabled, nonce]);

	return { ...state, reload };
}
