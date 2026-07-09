"use client";

import type { AiAssistantConfigResponse } from "@workspace/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createAiAssistantApi } from "@/lib/aiAssistantApi";

interface UseAiAssistantConfigOptions {
	token: string | null | undefined;
	adminToken: string | null | undefined;
	enabled: boolean;
}

export const useAiAssistantConfig = ({
	token,
	adminToken,
	enabled,
}: UseAiAssistantConfigOptions) => {
	const api = useMemo(() => createAiAssistantApi(token ?? ""), [token]);
	const [config, setConfig] = useState<AiAssistantConfigResponse | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled || !adminToken) return;
		setLoading(true);
		setError(null);
		try {
			setConfig(await api.getConfig(adminToken));
		} catch (configError) {
			setError(
				configError instanceof Error
					? configError.message
					: "دریافت تنظیمات دستیار هوش مصنوعی ممکن نشد.",
			);
		} finally {
			setLoading(false);
		}
	}, [adminToken, api, enabled]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { config, loading, error, refresh };
};
