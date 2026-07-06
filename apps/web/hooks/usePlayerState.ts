"use client";

import type { PlayerStateResponse } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import type { PlayerRuntimeApi } from "@/lib/playerRuntimeApi";
import type { RuntimeApiContext } from "@/lib/runtimeApiContext";

export const usePlayerState = (api: PlayerRuntimeApi, enabled: boolean) => {
	const [state, setState] = useState<PlayerStateResponse | null>(null);
	const [context, setContext] = useState<RuntimeApiContext | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		setError(null);
		try {
			const [nextState, nextContext] = await Promise.all([
				api.getState(),
				api.getRuntimeContext().catch(() => null),
			]);
			setState(nextState);
			setContext(nextContext);
		} catch (requestError) {
			setError(
				parseRuntimeApiError(requestError, "دریافت وضعیت بازیکن ممکن نشد.")
					.message,
			);
		} finally {
			setLoading(false);
		}
	}, [api, enabled]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { state, context, loading, error, refresh };
};
