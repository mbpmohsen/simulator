"use client";

import type { PlayerAiPurchaseResponse } from "@workspace/trpc";
import { useCallback, useMemo, useState } from "react";
import type { AiAssistantRoleContext } from "@/lib/aiAssistantApi";
import { createAiAssistantApi } from "@/lib/aiAssistantApi";

interface UsePurchaseAiAssistantLevelOptions {
	token: string | null | undefined;
	context: AiAssistantRoleContext;
	onSuccess?: (response: PlayerAiPurchaseResponse) => void | Promise<void>;
	onSettled?: () => void | Promise<void>;
}

export const usePurchaseAiAssistantLevel = ({
	token,
	context,
	onSuccess,
	onSettled,
}: UsePurchaseAiAssistantLevelOptions) => {
	const api = useMemo(() => createAiAssistantApi(token ?? ""), [token]);
	const [purchasing, setPurchasing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const purchase = useCallback(async () => {
		setPurchasing(true);
		setError(null);
		try {
			const response = await api.purchaseLevel(context);
			await onSuccess?.(response);
			return response;
		} catch (purchaseError) {
			const message =
				purchaseError instanceof Error
					? purchaseError.message
					: "خرید ارتقا دستیار هوش مصنوعی ناموفق بود.";
			setError(message);
			throw new Error(message);
		} finally {
			await onSettled?.();
			setPurchasing(false);
		}
	}, [api, context, onSettled, onSuccess]);

	return { purchase, purchasing, error };
};
