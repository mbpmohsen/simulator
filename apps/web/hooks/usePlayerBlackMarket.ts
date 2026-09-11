"use client";

import type {
	BlackMarketItemSchema,
	BlackMarketItemView,
	GameStateData,
} from "@workspace/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";

/**
 * Black market.
 *
 *   list     GET  /client/player/black-market  ->  BlackMarketItemView[]   (live)
 *   purchase POST /client/vote_action          ->  { black_market_item_id } (v1)
 *
 * The two halves disagree on identity: the list returns a string `code`, the
 * purchase wants a numeric `black_market_item_id`. Nothing in
 * `BlackMarketItemView` carries that id, so it has to be recovered from the
 * catalogue in `/client/game_state`.
 *
 * Buying the wrong item is worse than not buying, so when the id cannot be
 * resolved with confidence the item is marked unpurchasable and says so,
 * instead of guessing.
 *
 * Contract and status: docs/black-market-contract.md.
 */

export type BlackMarketStatus =
	| "idle"
	| "loading"
	| "ready"
	| "unavailable"
	| "error";

interface State {
	status: BlackMarketStatus;
	items: BlackMarketItemView[];
	message: string | null;
}

const statusOf = (error: unknown): number | null => {
	const response = (error as { response?: { status?: unknown } })?.response;
	return typeof response?.status === "number" ? response.status : null;
};

const text = (value: unknown): string | null =>
	typeof value === "string" && value.trim().length > 0
		? value.trim().toLowerCase()
		: null;

/**
 * code -> numeric id, from whatever the catalogue actually exposes.
 *
 * Tried in descending order of confidence. `BlackMarketItemSchema` is declared
 * with an index signature, so the server may well send a `code` even though the
 * schema does not name one - that is the reliable case, and the rest are
 * fallbacks for when it does not.
 */
const buildIdByCode = (
	gameState: GameStateData | null | undefined,
): Map<string, number> => {
	const map = new Map<string, number>();
	if (!gameState) return map;

	const add = (key: string | null, id: unknown): void => {
		if (!key || typeof id !== "number" || map.has(key)) return;
		map.set(key, id);
	};

	const entries: Array<[string | null, BlackMarketItemSchema]> = [];
	for (const item of gameState.blackMarketItems ?? []) entries.push([null, item]);
	// byId may be keyed by code rather than by id - keep the key either way.
	for (const [key, item] of Object.entries(
		gameState.byId?.blackMarketItems ?? {},
	)) {
		entries.push([key, item]);
	}

	// 1. an explicit code on the catalogue entry, or the byId key
	for (const [key, item] of entries) {
		const raw = item as unknown as Record<string, unknown>;
		add(text(raw.code), item.id);
		if (key && !/^\d+$/.test(key)) add(text(key), item.id);
	}
	// 2. `name`, which falls back to the code when the plan sets no display name
	for (const [, item] of entries) add(text(item.name), item.id);

	return map;
};

export const usePlayerBlackMarket = (
	api: PlayerRuntimeApi | null,
	enabled: boolean,
	currentTurn: number | null,
	gameState: GameStateData | null | undefined,
) => {
	const [state, setState] = useState<State>({
		status: "idle",
		items: [],
		message: null,
	});
	const [busyCode, setBusyCode] = useState<string | null>(null);

	const idByCode = useMemo(() => buildIdByCode(gameState), [gameState]);

	const resolveItemId = useCallback(
		(item: BlackMarketItemView): number | null =>
			idByCode.get(item.code.toLowerCase()) ??
			idByCode.get((item.name ?? "").toLowerCase()) ??
			null,
		[idByCode],
	);

	const refresh = useCallback(async () => {
		if (!api || !enabled) return;
		setState((current) => ({ ...current, status: "loading" }));
		try {
			const items = await api.getBlackMarketItems();
			setState({
				status: "ready",
				items: Array.isArray(items) ? items : [],
				message: null,
			});
		} catch (error) {
			const status = statusOf(error);
			// 404/501 not built, 403 caller has no team, null network failure.
			// None of these deserve a red box on a live board.
			if (
				status === null ||
				status === 403 ||
				status === 404 ||
				status === 501
			) {
				setState({ status: "unavailable", items: [], message: null });
				return;
			}
			setState({
				status: "error",
				items: [],
				message: parseRuntimeApiError(
					error,
					"دریافت فهرست بازار سیاه ممکن نشد.",
				).message,
			});
		}
	}, [api, enabled]);

	useEffect(() => {
		void refresh();
	}, [refresh, currentTurn]);

	const purchase = useCallback(
		async (item: BlackMarketItemView): Promise<boolean> => {
			if (!api) return false;
			const itemId = resolveItemId(item);
			if (itemId === null) {
				setState((current) => ({
					...current,
					message:
						"شناسهٔ عددی این آیتم در وضعیت بازی پیدا نشد، بنابراین خرید ارسال نشد.",
				}));
				return false;
			}
			setBusyCode(item.code);
			try {
				await api.voteAction({ black_market_item_id: itemId });
				await refresh();
				return true;
			} catch (error) {
				setState((current) => ({
					...current,
					message: parseRuntimeApiError(error, "خرید این آیتم ممکن نشد.")
						.message,
				}));
				return false;
			} finally {
				setBusyCode(null);
			}
		},
		[api, refresh, resolveItemId],
	);

	return { ...state, busyCode, refresh, purchase, resolveItemId };
};
