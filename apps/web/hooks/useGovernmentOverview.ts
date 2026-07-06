"use client";

import type { GovernmentOverviewResponse } from "@workspace/trpc";
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
			const [nextOverview, nextContext] = await Promise.all([
				api.getOverview(),
				api.getRuntimeContext().catch(() => null),
			]);
			setOverview(nextOverview);
			setContext(nextContext);
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
