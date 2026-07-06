"use client";

import type { OrderView } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";

export const usePlayerOrders = (
	api: PlayerRuntimeApi,
	turn: number | undefined,
	enabled: boolean,
) => {
	const [orders, setOrders] = useState<OrderView[]>([]);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		try {
			setOrders(await api.getOrders(turn));
			setError(null);
		} catch (requestError) {
			setError(
				parseRuntimeApiError(requestError, "دریافت دستورات دولت ناموفق بود.")
					.message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, enabled, turn]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { orders, loading, error, refresh };
};
