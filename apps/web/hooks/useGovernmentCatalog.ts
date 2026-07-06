"use client";

import type { GovernmentCatalogResponse } from "@workspace/trpc";
import { useCallback, useEffect, useState } from "react";
import {
	type GovernmentRuntimeApi,
	getGovernmentCatalogErrorMessageFa,
} from "@/lib/governmentRuntimeApi";

export const useGovernmentCatalog = (
	api: GovernmentRuntimeApi,
	enabled: boolean,
	gameId?: string | null,
) => {
	const [catalog, setCatalog] = useState<GovernmentCatalogResponse | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		if (!enabled) return;
		const catalogScope = gameId ?? "active-game";
		if (!catalogScope) return;
		setIsLoading(true);
		setError(null);
		try {
			setCatalog(await api.getCatalog());
		} catch (requestError) {
			setCatalog(null);
			setError(getGovernmentCatalogErrorMessageFa(requestError));
		} finally {
			setIsLoading(false);
		}
	}, [api, enabled, gameId]);

	useEffect(() => {
		setCatalog(null);
		void refetch();
	}, [refetch]);

	return { catalog, isLoading, error, refetch };
};
