import { formatLockReasonFa } from "./localization";

export interface ParsedApiError {
	status: number | null;
	code: string | null;
	message: string;
	reasons: Array<{ code: string; message: string; source: string | null }>;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;

const readStatus = (error: unknown): number | null => {
	const root = asRecord(error);
	const response = asRecord(root?.response);
	const candidate = response?.status ?? root?.status;
	return typeof candidate === "number" ? candidate : null;
};

export const parseApiError = (
	error: unknown,
	fallback = "خطایی رخ داد.",
): ParsedApiError => {
	const root = asRecord(error);
	const response = asRecord(root?.response);
	const responseData = asRecord(response?.data);
	const rawDetail = responseData?.detail ?? root?.detail;
	const detail = asRecord(rawDetail);
	const code = typeof detail?.code === "string" ? detail.code : null;
	const rawReasons = Array.isArray(detail?.reasons) ? detail.reasons : [];
	const reasons = rawReasons.flatMap((reason) => {
		const value = asRecord(reason);
		if (!value || typeof value.code !== "string") return [];
		return [
			{
				code: value.code,
				message: formatLockReasonFa(
					value.code,
					typeof value.message === "string" ? value.message : undefined,
				),
				source: typeof value.source === "string" ? value.source : null,
			},
		];
	});
	const rawMessage =
		(typeof detail?.detail === "string" && detail.detail) ||
		(typeof detail?.message === "string" && detail.message) ||
		(typeof rawDetail === "string" && rawDetail) ||
		(typeof responseData?.message === "string" && responseData.message) ||
		(typeof root?.message === "string" && root.message) ||
		fallback;

	return {
		status: readStatus(error),
		code,
		message: code ? formatLockReasonFa(code, rawMessage) : rawMessage,
		reasons,
	};
};
