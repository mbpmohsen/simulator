import type {
	ActionSchema,
	GameEvent,
	GamePhase,
	GovernmentOrderType,
	LockReason,
	SubjectStatus,
} from "@workspace/trpc";
import {
	formatExecutionModeFa,
	formatLockReasonFa,
	formatOrderTypeFa,
	formatPhaseFa,
	formatRoleFa,
	formatScenarioTypeFa,
	formatStepStatusFa,
	getLocalized,
} from "@workspace/trpc";

export {
	formatExecutionModeFa,
	formatLockReasonFa,
	formatOrderTypeFa,
	formatPhaseFa,
	formatRoleFa,
	formatScenarioTypeFa,
	formatStepStatusFa,
	getLocalized,
};

const PHASES: GamePhase[] = [
	"GOVERNMENT_SELECTION",
	"SELECTION",
	"VOTING",
	"CALCULATION",
];

export const isGamePhase = (value: unknown): value is GamePhase =>
	typeof value === "string" &&
	PHASES.includes(value.toUpperCase() as GamePhase);

const SUBJECT_STATUS_FA: Record<SubjectStatus, string> = {
	active: "فعال",
	stalled: "متوقف‌شده",
	completed: "تکمیل‌شده",
};

export const translateSubjectStatusFa = (
	status: SubjectStatus | undefined,
): string => (status ? SUBJECT_STATUS_FA[status] : "فعال");

const EVENT_TYPE_FA: Record<string, string> = {
	SCENARIO_STEP_RESOLVED: "نتیجه گام سناریو",
	GOVERNMENT_ORDER_ISSUED: "دستور جدید دولت",
	GOVERNMENT_SELECTION_STARTED: "شروع انتخاب دولت",
	GOVERNMENT_SELECTION_ENDED: "پایان انتخاب دولت",
	PHASE_STARTED: "شروع مرحله",
	PHASE_ENDED: "پایان مرحله",
	VOTING_STARTED: "شروع رأی‌گیری",
	VOTING_ENDED: "پایان رأی‌گیری",
	TURN_STARTED: "شروع نوبت",
	TURN_ENDED: "پایان نوبت",
	CREDITS_UPDATED: "تغییر اعتبار",
	POINTS_UPDATED: "تغییر امتیاز",
	ACTION_REJECTED: "رد کنش",
	GAME_STARTED: "شروع بازی",
	GAME_ENDED: "پایان بازی",
	GAME_PAUSED: "توقف موقت بازی",
	GAME_RESUMED: "ادامهٔ بازی",
	WINNER_DECLARED: "اعلام برنده",
	DRAW_DECLARED: "اعلام تساوی",
	TURN_RESULTS: "نتیجهٔ نوبت",
	VOTE_CAST: "ثبت رأی",
	VOTE_SUBMITTED: "ارسال رأی",
	VOTE_TALLY_UPDATED: "به‌روزرسانی شمارش آرا",
	TEAM_MAJORITY_DECIDED: "تصمیم اکثریت تیم",
	TEAM_ACTION_SELECTED: "انتخاب کنش تیم",
	TEAMMATE_ACTION_SELECTED: "انتخاب کنش هم‌تیمی",
	TEAM_ACTION_RESOLVED: "نتیجهٔ کنش تیم",
	TEAM_READY: "آمادگی تیم",
	ALL_TEAMS_READY: "آمادگی همهٔ تیم‌ها",
	ACTION_EXECUTED: "اجرای کنش",
	ACTION_UNLOCKED: "باز شدن کنش",
	EFFECT_APPLIED: "اعمال اثر",
	INVALID_ACTION_ATTEMPTED: "تلاش برای کنش نامعتبر",
	READY: "آماده‌باش",
	PHASE_TIMEOUT: "پایان زمان مرحله",
	TEAM_TARGET_SELECTED: "انتخاب هدف تیم",
	GOVERNMENT_INTERVENTION: "مداخلهٔ دولت",
	GOVERNMENT_ALERT: "هشدار دولت",
	ATTACK_DECLARED: "اعلام حمله",
	ATTACK_RESOLVED: "نتیجهٔ حمله",
	DEFENSE_RESOLVED: "نتیجهٔ دفاع",
	COMBAT_ROUND_COMPLETED: "پایان دور درگیری",
	DAMAGE_APPLIED: "اعمال آسیب",
	CALCULATION_STARTED: "شروع محاسبه",
	CALCULATION_ENDED: "پایان محاسبه",
	TURN_ANALYTICS_RECORDED: "ثبت تحلیل نوبت",
	BLACK_MARKET_ITEM_PURCHASED: "خرید از بازار سیاه",
	BLACK_MARKET_ITEM_ACTIVATED: "فعال‌سازی آیتم بازار سیاه",
	BLACK_MARKET_ITEM_EXPIRED: "پایان اعتبار آیتم بازار سیاه",
	FACTOR_CREATED: "ایجاد ضریب",
	FACTOR_APPLIED: "اعمال ضریب",
	FACTOR_EXPIRED: "پایان ضریب",
	DIRECTIVE_SET: "ثبت دستورالعمل",
	DIRECTIVE_STARTED: "شروع دستورالعمل",
	DIRECTIVE_ENDED: "پایان دستورالعمل",
	DIRECTIVE_EFFECT_APPLIED: "اعمال اثر دستورالعمل",
	DIRECTIVES_APPLIED: "اعمال دستورالعمل‌ها",
	USER_ASSIGNED_TO_GAME: "افزوده‌شدن کاربر به بازی",
	USER_STREAM_CONNECTED: "اتصال کاربر",
	USER_STREAM_DISCONNECTED: "قطع اتصال کاربر",
	USER_HEARTBEAT: "بررسی اتصال",
	TEAM_MEMBER_OFFLINE: "آفلاین‌شدن عضو تیم",
	TEAM_STATE_CHANGED: "تغییر وضعیت تیم",
	GAME_CONFIGURED: "پیکربندی بازی",
	GAME_RESET: "بازنشانی بازی",
	GAME_STATE_SNAPSHOT: "وضعیت لحظه‌ای بازی",
	ERROR: "خطا",
};

const CONTAINS_PERSIAN = /[\u0600-\u06FF]/;

export const translateEventTypeFa = (type: string): string =>
	EVENT_TYPE_FA[type] ?? type;

/**
 * The server writes event messages in English. Prefer a Persian sentence built
 * from the payload; keep the server text only when it is already Persian, so no
 * detail is lost and no English reaches the player.
 */
const describeEventFa = (event: GameEvent): string | null => {
	const payload = event.payload as Record<string, unknown>;
	const asString = (value: unknown): string | null =>
		typeof value === "string" && value.trim() ? value : null;

	switch (event.type) {
		case "GOVERNMENT_ORDER_ISSUED": {
			const orderType = asString(payload.order_type);
			if (!orderType) return null;
			const label = formatOrderTypeFa(orderType as GovernmentOrderType);
			const subject = asString(payload.subject_id);
			return subject
				? `دولت دستور «${label}» را برای «${subject}» صادر کرد.`
				: `دولت دستور «${label}» را صادر کرد.`;
		}
		case "SCENARIO_STEP_RESOLVED": {
			const code = asString(payload.action_code);
			if (!code) return null;
			const outcome = payload.result === "success" ? "موفق بود" : "ناموفق بود";
			return `کنش «${formatActionCodeFa(code)}» ${outcome}.`;
		}
		case "WINNER_DECLARED":
			return "برندهٔ بازی مشخص شد.";
		case "DRAW_DECLARED":
			return "بازی با تساوی به پایان رسید.";
		case "GAME_PAUSED":
			return "بازی موقتا متوقف شد.";
		case "GAME_RESUMED":
			return "بازی از سر گرفته شد.";
		case "TEAM_READY":
			return "تیم اعلام آمادگی کرد.";
		case "ALL_TEAMS_READY":
			return "همهٔ تیم‌ها آماده‌اند.";
		case "INVALID_ACTION_ATTEMPTED":
			return "کنش نامعتبری تلاش شد و ثبت نشد.";
		default:
			return null;
	}
};

export const eventMessageFa = (event: GameEvent): string => {
	const message = event.payload.message;
	if (typeof message === "string" && CONTAINS_PERSIAN.test(message))
		return message;
	return describeEventFa(event) ?? "رویداد تازه‌ای در بازی ثبت شد.";
};

export interface LockReasonDisplay {
	code: string;
	message: string;
	source: string | null;
}

export const formatLockReasonsForDisplay = (
	reasons: LockReason[],
): LockReasonDisplay[] =>
	reasons.map((reason) => ({
		code: reason.code,
		message: formatLockReasonFa(reason.code, reason.message),
		source: reason.source,
	}));

export const orderTypeNeedsSubject = (type: GovernmentOrderType): boolean =>
	type === "ASSIGN_SUBJECT" || type === "FORCE_SUBJECT";

const ACTION_TOKEN_FA: Record<string, string> = {
	ATK: "تهاجمی",
	DEF: "دفاعی",
	ABUSE: "سوءاستفاده",
	ACCESS: "دسترسی",
	ALERT: "هشدار",
	ALLOCATION: "تخصیص",
	ANOMALY: "ناهنجاری",
	APPROVAL: "تأیید",
	ASSET: "دارایی",
	ASSURANCE: "اطمینان‌بخشی",
	AUDIT: "ممیزی",
	AUTHORIZATION: "مجوزدهی",
	BACKUP: "پشتیبان‌گیری",
	CAPACITY: "ظرفیت",
	CHAIN: "زنجیره",
	CHALLENGE: "چالش",
	CHANGE: "تغییر",
	CHECK: "بررسی",
	CIVIC: "شهری",
	COMMAND: "فرماندهی",
	COMMUNICATION: "ارتباطات",
	CONFIGURATION: "پیکربندی",
	CONFUSION: "اختلال ادراکی",
	CONTENTION: "رقابت منابع",
	CONTINUITY: "تداوم",
	CONTROL: "کنترل",
	COORDINATION: "هماهنگی",
	CORRELATION: "هم‌بستگی",
	CREDENTIAL: "اعتبارنامه",
	DATA: "داده",
	DEGRADATION: "کاهش کیفیت",
	DELAY: "تأخیر",
	DEPENDENCY: "وابستگی",
	DISRUPTION: "اختلال",
	DRILL: "مانور",
	DUAL: "دوگانه",
	EMERGENCY: "اضطراری",
	EXCEPTION: "استثنا",
	EXHAUSTION: "فرسودگی",
	FAILOVER: "جایگزینی سرویس",
	FALLBACK: "بازگشت ایمن",
	FATIGUE: "خستگی",
	FREEZE: "توقف",
	FRICTION: "اصطکاک",
	HARDENING: "سخت‌سازی",
	IDENTITY: "هویت",
	INCIDENT: "رخداد",
	INFLUENCE: "اثرگذاری",
	INFORMATION: "اطلاعات",
	INTEGRITY: "یکپارچگی",
	INVENTORY: "فهرست دارایی",
	ISOLATION: "جداسازی",
	LATERAL: "جانبی",
	MANIPULATION: "دست‌کاری",
	MANUAL: "دستی",
	MAPPING: "نقشه‌برداری",
	MESSAGING: "پیام‌رسانی",
	MISUSE: "استفاده نادرست",
	MONITORING: "پایش",
	MOVEMENT: "حرکت",
	NETWORK: "شبکه",
	NOTIFICATION: "اعلان",
	OPERATOR: "اپراتور",
	OVERLOAD: "اضافه‌بار",
	PARTY: "طرف",
	PATH: "مسیر",
	PLAYBOOK: "برنامه واکنش",
	POLICY: "سیاست",
	PORTAL: "درگاه",
	PRESSURE: "فشار",
	PRIORITIZATION: "اولویت‌بندی",
	PRIVILEGE: "سطح دسترسی",
	PRIVILEGED: "دارای دسترسی ویژه",
	PROCESS: "فرایند",
	PUBLIC: "عمومی",
	QUEUE: "صف",
	RECON: "شناسایی",
	RECOVERY: "بازیابی",
	REDUNDANCY: "افزونگی",
	REGISTER: "ثبت",
	RESERVE: "ذخیره",
	RESOURCE: "منابع",
	RESPONSE: "پاسخ",
	RESTORE: "بازگردانی",
	REVIEW: "بازبینی",
	ROUTE: "مسیر",
	ROUTING: "مسیریابی",
	SCHEDULE: "زمان‌بندی",
	SEGMENTATION: "بخش‌بندی",
	SERVICE: "خدمت",
	SESSION: "نشست",
	SIM: "شبیه‌سازی‌شده",
	STABILIZATION: "پایدارسازی",
	SUPPLIER: "تأمین‌کننده",
	SUPPLY: "تأمین",
	TELEMETRY: "تله‌متری",
	TEST: "آزمون",
	THIRD: "شخص ثالث",
	TRIAGE: "اولویت‌بندی رخداد",
	TRUST: "اعتماد",
	VALIDATION: "اعتبارسنجی",
	VENDOR: "فروشنده",
	VERIFICATION: "راستی‌آزمایی",
	WORKFLOW: "گردش کار",
};

export const formatActionCodeFa = (code: string): string =>
	code
		.split("_")
		.filter(Boolean)
		.map((token) => ACTION_TOKEN_FA[token.toUpperCase()] ?? token)
		.join(" ");

export const formatActionOptionFa = (action: ActionSchema): string => {
	const localizedCandidates = [
		action.displayNameFa,
		action.display_name_fa,
		action.nameFa,
		action.name_fa,
	];
	const localized = localizedCandidates.find(
		(value): value is string =>
			typeof value === "string" && value.trim().length > 0,
	);
	return localized?.trim() || formatActionCodeFa(action.name);
};
