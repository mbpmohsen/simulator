"use client";

import type { OrderView } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { GovernmentRuntimeApi } from "@/lib/governmentRuntimeApi";

export const useGovernmentOrders = (
	api: GovernmentRuntimeApi,
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
				parseRuntimeApiError(requestError, "دریافت تاریخچه دستورها ناموفق بود.")
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
