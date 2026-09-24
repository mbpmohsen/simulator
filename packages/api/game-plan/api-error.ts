import { formatLockReasonFa } from "./localization";

export interface ParsedApiError {
	status: number | null;
	code: string | null;
	message: string;
	reasons: Array<{ code: string; message: string; source: string | null }>;
	/** FastAPI 422 body validation items, already turned into Persian sentences. */
	validationErrors: Array<{ path: string; message: string }>;
}

/**
 * Persian labels for the `loc` paths FastAPI reports on `POST /admin/configure_all`.
 * A path with no entry falls back to a generic sentence rather than leaking the
 * raw English path into the UI.
 */
const FIELD_LABEL_FA: Record<string, string> = {
	"game_config.time_unit": "واحد زمان بازی",
	"game_config.num_turns": "تعداد نوبت‌ها",
	"game_config.point_threshold": "امتیاز لازم برای پیروزی",
	"game_config.turn_duration_seconds": "مدت هر نوبت",
	game_config: "تنظیمات کلی بازی",
	teams: "تیم‌ها",
	actions: "کنش‌ها",
	government: "دولت",
	action_counters: "پادکنش‌ها",
	black_market: "بازار سیاه",
};

const validationMessageFa = (
	path: string,
	type: string | null,
	rawMessage: string | null,
): string => {
	const label = FIELD_LABEL_FA[path] ?? null;
	const subject = label ? `«${label}»` : "یکی از فیلدهای برنامه";
	if (type === "missing") {
		return `${subject} ارسال نشده است؛ سرور این فیلد را الزامی می‌داند.`;
	}
	if (type === "value_error") {
		// e.g. "Value error, Unknown time_unit 'fortnight'. Allowed: ..."
		return `مقدار ${subject} معتبر نیست.`;
	}
	if (rawMessage) return `${subject}: ${rawMessage}`;
	return `${subject} پذیرفته نشد.`;
};

const readValidationErrors = (
	rawDetail: unknown,
): Array<{ path: string; message: string }> => {
	if (!Array.isArray(rawDetail)) return [];
	return rawDetail.flatMap((item) => {
		const value = asRecord(item);
		if (!value) return [];
		const loc = Array.isArray(value.loc) ? value.loc : [];
		const path = loc
			.filter((part) => typeof part === "string" || typeof part === "number")
			.filter((part) => part !== "body")
			.join(".");
		if (!path) return [];
		return [
			{
				path,
				message: validationMessageFa(
					path,
					typeof value.type === "string" ? value.type : null,
					typeof value.msg === "string" ? value.msg : null,
				),
			},
		];
	});
};

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
	const validationErrors = readValidationErrors(rawDetail);
	const detail = Array.isArray(rawDetail) ? null : asRecord(rawDetail);
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
		(validationErrors.length > 0 &&
			validationErrors.map((item) => item.message).join(" ")) ||
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
		validationErrors,
	};
};
