"use client";

import type { SubjectView } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";

const EMPTY_SUBJECTS: SubjectView[] = [];

export const usePlayerSubjects = (
	api: PlayerRuntimeApi,
	enabled: boolean,
	fallback: SubjectView[] = EMPTY_SUBJECTS,
) => {
	const [subjects, setSubjects] = useState<SubjectView[]>(fallback);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		try {
			setSubjects(await api.getSubjects());
			setError(null);
		} catch (requestError) {
			setSubjects((current) => (current.length > 0 ? current : fallback));
			setError(
				parseRuntimeApiError(
					requestError,
					"دریافت موضوع‌های محول‌شده ناموفق بود.",
				).message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, enabled, fallback]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { subjects, loading, error, refresh };
};
