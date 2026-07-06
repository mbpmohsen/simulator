"use client";

import type { ScenarioView } from "@workspace/trpc";
import { useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";

export const usePlayerScenarios = (
	api: PlayerRuntimeApi,
	subSubjectId: string | null,
) => {
	const [scenarios, setScenarios] = useState<ScenarioView[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!subSubjectId) {
			setScenarios([]);
			setError(null);
			return;
		}
		let active = true;
		setLoading(true);
		void api
			.getScenarios(subSubjectId)
			.then((items) => {
				if (active) {
					setScenarios(items);
					setError(null);
				}
			})
			.catch((requestError: unknown) => {
				if (active)
					setError(
						parseRuntimeApiError(requestError, "دریافت سناریوها ناموفق بود.")
							.message,
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [api, subSubjectId]);

	return { scenarios, loading, error };
};
