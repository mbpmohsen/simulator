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
};

export const translateEventTypeFa = (type: string): string =>
	EVENT_TYPE_FA[type] ?? type;

export const eventMessageFa = (event: GameEvent): string => {
	const message = event.payload.message;
	return typeof message === "string" && message.trim()
		? message
		: "رویداد تازه‌ای در بازی ثبت شد.";
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
