"use client";

import type { StepView } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";

export const useScenarioSteps = (
	api: PlayerRuntimeApi,
	scenarioId: string | null,
) => {
	const [steps, setSteps] = useState<StepView[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!scenarioId) {
			setSteps([]);
			return;
		}
		setLoading(true);
		try {
			setSteps(await api.getScenarioSteps(scenarioId));
			setError(null);
		} catch (requestError) {
			setError(
				parseRuntimeApiError(requestError, "دریافت گام‌ها ناموفق بود.").message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, scenarioId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { steps, loading, error, refresh };
};
