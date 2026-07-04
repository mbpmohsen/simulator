import type {
	ExecutionMode,
	GamePhase,
	GovernmentOrderType,
	ImpactEffectType,
	ScenarioType,
	StepStatus,
	TeamRoleType,
} from "../game-server/types";

export const getLocalized = (
	value: string | null | undefined,
	faValue: string | null | undefined,
): string => faValue?.trim() || value?.trim() || "—";

const ROLE_FA: Record<TeamRoleType | "ADMIN", string> = {
	ATTACKER: "مهاجم",
	DEFENCER: "مدافع",
	BOTH: "ترکیبی",
	GOVERNMENT: "دولت",
	ADMIN: "مدیر",
};

const SCENARIO_TYPE_FA: Record<ScenarioType, string> = {
	attack_path: "مسیر تهاجمی",
	defense_path: "مسیر دفاعی",
};

const EXECUTION_MODE_FA: Record<ExecutionMode, string> = {
	ordered: "ترتیبی",
	checklist: "چک‌لیستی",
	branching: "شاخه‌ای",
};

const STEP_STATUS_FA: Record<StepStatus, string> = {
	available: "در دسترس",
	completed: "تکمیل‌شده",
	failed: "شکست‌خورده",
	locked: "قفل",
};

const EFFECT_TYPE_FA: Record<ImpactEffectType | "SUBJECT_PROGRESS", string> = {
	ADVANCE_PROGRESS: "افزایش پیشرفت",
	STALL_SUBJECT: "توقف موضوع",
	RESUME_SUBJECT: "ادامه موضوع",
	DISABLE_ACTION: "غیرفعال‌سازی کنش",
	ENABLE_ACTION: "فعال‌سازی کنش",
	LOCK_SCENARIO: "قفل سناریو",
	UNLOCK_SCENARIO: "بازکردن سناریو",
	SKIP_STEP: "عبور از گام",
	CREDIT_DELTA: "تغییر اعتبار",
	POINT_DELTA: "تغییر امتیاز",
	REVEAL_TO_GOVERNMENT: "نمایش به دولت",
	REDUCE_VISIBILITY: "کاهش سطح نمایش",
	PROBABILITY_MODIFIER: "تغییر احتمال",
	REMOVE_ACTIVE_EFFECT: "حذف اثر فعال",
	SUBJECT_PROGRESS: "پیشرفت موضوع",
};

const ORDER_TYPE_FA: Record<GovernmentOrderType, string> = {
	ASSIGN_SUBJECT: "تخصیص موضوع",
	FORCE_SUBJECT: "اجبار به موضوع",
	ALLOCATE_CREDIT: "تخصیص اعتبار",
	BAN_ACTION: "ممنوع‌کردن کنش",
	UNBAN_ACTION: "رفع ممنوعیت کنش",
	DISABLE_TEAM: "غیرفعال‌کردن تیم",
	ENABLE_TEAM: "فعال‌کردن تیم",
};

const PHASE_FA: Record<GamePhase, string> = {
	GOVERNMENT_SELECTION: "انتخاب دولت",
	SELECTION: "انتخاب مسیر",
	VOTING: "رأی‌گیری",
	CALCULATION: "محاسبه نتیجه",
};

export const formatRoleFa = (role: TeamRoleType | "ADMIN"): string =>
	ROLE_FA[role];
export const formatScenarioTypeFa = (type: ScenarioType): string =>
	SCENARIO_TYPE_FA[type];
export const formatExecutionModeFa = (mode: ExecutionMode): string =>
	EXECUTION_MODE_FA[mode];
export const formatStepStatusFa = (status: StepStatus): string =>
	STEP_STATUS_FA[status];
export const formatEffectTypeFa = (
	type: ImpactEffectType | "SUBJECT_PROGRESS",
): string => EFFECT_TYPE_FA[type];
export const formatOrderTypeFa = (type: GovernmentOrderType): string =>
	ORDER_TYPE_FA[type];
export const formatPhaseFa = (phase: GamePhase): string => PHASE_FA[phase];

const LOCK_REASON_FA: Record<string, string> = {
	SUBJECT_NOT_ASSIGNED: "این موضوع به تیم شما تخصیص داده نشده است.",
	MISSING_PREREQUISITE_STEP: "پیش‌نیاز این گام هنوز تکمیل نشده است.",
	SUBJECT_STALLED_BY_IMPACT: "این موضوع به دلیل اثر فعال متوقف شده است.",
	ACTION_DISABLED_BY_IMPACT: "این کنش به دلیل اثر فعال غیرفعال شده است.",
	TEAM_DISABLED_BY_GOVERNMENT: "تیم توسط دولت غیرفعال شده است.",
	ACTION_BANNED_BY_GOVERNMENT: "این کنش توسط دولت ممنوع شده است.",
	TEAM_ROLE_FORBIDS_ACTION_CATEGORY: "نقش تیم اجازه این دسته کنش را نمی‌دهد.",
	ACTION_TYPE_NOT_IN_TEAM_ALLOWLIST: "این نوع کنش در فهرست مجاز تیم نیست.",
	TEAM_ROLE_NOT_ALLOWED_FOR_ACTION: "نقش تیم برای این کنش مجاز نیست.",
	TEAM_NOT_ALLOWED_FOR_ACTION: "این تیم برای این کنش مجاز نیست.",
	ACTION_TEAM_SCOPE_INVALID: "محدوده تیم برای این کنش معتبر نیست.",
	ACTION_LOCKED_PREREQUISITES: "پیش‌نیازهای کنش هنوز باز نشده‌اند.",
	SELECTION_PHASE_CLOSED: "انتخاب سناریو فقط در فاز انتخاب مسیر امکان‌پذیر است.",
	VOTING_PHASE_CLOSED: "رأی‌دادن فقط در فاز رأی‌گیری امکان‌پذیر است.",
	STEP_LOCKED: "این گام در حال حاضر قفل است.",
	SCENARIO_ROLE_NOT_ALLOWED: "نقش تیم اجازه انتخاب این سناریو را نمی‌دهد.",
};

export const formatLockReasonFa = (code: string, fallback?: string): string =>
	LOCK_REASON_FA[code] ?? fallback ?? "این گزینه در حال حاضر در دسترس نیست.";
