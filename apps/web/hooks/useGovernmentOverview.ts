"use client";

import {
	type GovernmentOverviewResponse,
	isGameFinished,
} from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { GovernmentRuntimeApi } from "@/lib/governmentRuntimeApi";
import type { RuntimeApiContext } from "@/lib/runtimeApiContext";

export const useGovernmentOverview = (
	api: GovernmentRuntimeApi,
	enabled: boolean,
) => {
	const [overview, setOverview] = useState<GovernmentOverviewResponse | null>(
		null,
	);
	const [context, setContext] = useState<RuntimeApiContext | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		setError(null);
		try {
			const [overviewResult, contextResult] = await Promise.allSettled([
				api.getOverview(),
				api.getRuntimeContext(),
			]);
			const nextContext =
				contextResult.status === "fulfilled" ? contextResult.value : null;
			if (nextContext) setContext(nextContext);
			if (overviewResult.status === "fulfilled") {
				setOverview(overviewResult.value);
			} else if (!isGameFinished(nextContext?.gameState.game)) {
				throw overviewResult.reason;
			}
		} catch (requestError) {
			setError(
				parseRuntimeApiError(requestError, "دریافت نمای فرماندهی ممکن نشد.")
					.message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, enabled]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { overview, context, loading, error, refresh };
};
