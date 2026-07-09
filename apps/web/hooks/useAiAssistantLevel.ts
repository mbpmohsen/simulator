"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AiAssistantLevelState,
	type AiAssistantRoleContext,
	createAiAssistantApi,
} from "@/lib/aiAssistantApi";

interface UseAiAssistantLevelOptions {
	token: string | null | undefined;
	context: AiAssistantRoleContext;
	enabled: boolean;
	refreshKey?: string | number | null;
}

const initialState: AiAssistantLevelState = {
	status: "error",
	level: null,
	message: "وضعیت دستیار هوش مصنوعی هنوز دریافت نشده است.",
};

export const useAiAssistantLevel = ({
	token,
	context,
	enabled,
	refreshKey,
}: UseAiAssistantLevelOptions) => {
	const api = useMemo(() => createAiAssistantApi(token ?? ""), [token]);
	const [state, setState] = useState<AiAssistantLevelState>(initialState);
	const [loading, setLoading] = useState(enabled);
	const hasLoadedRef = useRef(false);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(!hasLoadedRef.current);
		try {
			setState(await api.getLevel(context));
			hasLoadedRef.current = true;
		} finally {
			setLoading(false);
		}
	}, [api, context, enabled]);

	useEffect(() => {
		void refreshKey;
		if (!enabled) {
			hasLoadedRef.current = false;
			setLoading(false);
			setState(initialState);
			return;
		}
		void refresh();
	}, [enabled, refresh, refreshKey]);

	return {
		...state,
		loading,
		refresh,
	};
};
