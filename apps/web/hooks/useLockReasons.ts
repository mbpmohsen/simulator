"use client";

import type { LockReason, LockReasonsResponse } from "@workspace/trpc";
import { useCallback, useState } from "react";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";

export type LockReasonLoader = (nodeId: string) => Promise<LockReasonsResponse>;

export const useLockReasons = (loadReasons: LockReasonLoader) => {
	const [nodeId, setNodeId] = useState<string | null>(null);
	const [reasons, setReasons] = useState<LockReason[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const inspect = useCallback(
		async (nextNodeId: string) => {
			setNodeId(nextNodeId);
			setReasons([]);
			setLoading(true);
			setError(null);
			try {
				const response = await loadReasons(nextNodeId);
				setReasons(response.reasons);
			} catch (requestError) {
				setError(
					parseRuntimeApiError(requestError, "دریافت دلایل قفل ناموفق بود.")
						.message,
				);
			} finally {
				setLoading(false);
			}
		},
		[loadReasons],
	);

	const close = useCallback(() => {
		setNodeId(null);
		setReasons(null);
		setError(null);
	}, []);

	return { nodeId, reasons, loading, error, inspect, close };
};
