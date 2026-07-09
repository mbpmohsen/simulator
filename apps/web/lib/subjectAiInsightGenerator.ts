import type {
	GovernmentCatalogAction,
	GovernmentCatalogScenario,
	GovernmentCatalogSubject,
	GovernmentCatalogSubSubject,
} from "@workspace/trpc";
import { getLocalized } from "@/lib/runtimeTranslationsFa";

export type SubjectRuntimeProgress = {
	progress_percent?: number;
	status?: "active" | "stalled" | "completed" | string;
	sub_subjects?: Array<{
		id: string;
		progress_share?: number;
		completed?: boolean;
		stalled?: boolean;
	}>;
} | null;

export type SubjectAiInsightInput = {
	aiLevel: number;
	subject: GovernmentCatalogSubject;
	runtimeProgress?: SubjectRuntimeProgress;
	actionsByCode: Record<string, GovernmentCatalogAction>;
	currentTurn?: number | null;
	currentPhase?: string | null;
};

export type SubjectAiInsight = {
	subject_id: string;
	ai_level: number;
	headline_fa: string;
	summary_fa: string;
	strengths_fa: string[];
	risks_fa: string[];
	recommended_focus_fa: string[];
	key_numbers: {
		sub_subject_count: number;
		scenario_count: number;
		step_count: number;
		average_cost: number | null;
		average_success_probability: number | null;
		max_points_on_success: number | null;
		average_cooldown_turns: number | null;
	};
	confidence_label_fa: "پایین" | "متوسط" | "بالا";
};

export interface AiInsightProvider {
	generateSubjectInsight(
		input: SubjectAiInsightInput,
	): Promise<SubjectAiInsight>;
}

export class RuleBasedAiInsightProvider implements AiInsightProvider {
	async generateSubjectInsight(
		input: SubjectAiInsightInput,
	): Promise<SubjectAiInsight> {
		return generateSubjectAiInsight(input);
	}
}

// TODO: Replace this provider when a backend endpoint such as POST /ai/subject-insight exists.
export class RemoteAiInsightProvider implements AiInsightProvider {
	async generateSubjectInsight(): Promise<SubjectAiInsight> {
		throw new Error("Remote AI insight endpoint is not available yet.");
	}
}

type ActionNumbers = {
	cost: number | null;
	successProbability: number | null;
	pointsOnSuccess: number | null;
	cooldownTurns: number | null;
};

const compact = (values: Array<string | null | undefined>): string[] =>
	values.filter((value): value is string => Boolean(value?.trim()));

const average = (values: Array<number | null>): number | null => {
	const realValues = values.filter(
		(value): value is number =>
			typeof value === "number" && Number.isFinite(value),
	);
	if (realValues.length === 0) return null;
	return realValues.reduce((sum, value) => sum + value, 0) / realValues.length;
};

const maxValue = (values: Array<number | null>): number | null => {
	const realValues = values.filter(
		(value): value is number =>
			typeof value === "number" && Number.isFinite(value),
	);
	return realValues.length > 0 ? Math.max(...realValues) : null;
};

const roundMetric = (value: number | null): number | null =>
	value === null ? null : Math.round(value * 10) / 10;

const toPercentScale = (value: number | null): number | null => {
	if (value === null) return null;
	return value > 0 && value <= 1 ? value * 100 : value;
};

const readActionNumbers = (
	action: GovernmentCatalogAction | undefined,
): ActionNumbers => {
	const stats = action?.base_stats;
	return {
		cost:
			typeof stats?.cost === "number" && Number.isFinite(stats.cost)
				? stats.cost
				: null,
		successProbability:
			typeof stats?.success_probability === "number" &&
			Number.isFinite(stats.success_probability)
				? toPercentScale(stats.success_probability)
				: null,
		pointsOnSuccess:
			typeof stats?.points_on_success === "number" &&
			Number.isFinite(stats.points_on_success)
				? stats.points_on_success
				: null,
		cooldownTurns:
			typeof stats?.cooldown_turns === "number" &&
			Number.isFinite(stats.cooldown_turns)
				? stats.cooldown_turns
				: null,
	};
};

const flattenScenarios = (
	subject: GovernmentCatalogSubject,
): GovernmentCatalogScenario[] =>
	subject.sub_subjects.flatMap((subSubject) => subSubject.scenarios);

const countCompletedSubSubjects = (
	subject: GovernmentCatalogSubject,
	runtimeProgress: SubjectRuntimeProgress | undefined,
): number => {
	if (!runtimeProgress?.sub_subjects) return 0;
	const completedIds = new Set(
		runtimeProgress.sub_subjects
			.filter((subSubject) => subSubject.completed)
			.map((subSubject) => subSubject.id),
	);
	return subject.sub_subjects.filter((subSubject) =>
		completedIds.has(subSubject.id),
	).length;
};

const progressLabel = (progress: number | null): string => {
	if (progress === null) return "هنوز در داده‌های بازی ثبت نشده";
	if (progress < 34) return "پایین";
	if (progress < 67) return "متوسط";
	return "بالا";
};

const costPressureLabel = (averageCost: number | null): string => {
	if (averageCost === null) return "داده هزینه ثبت نشده";
	if (averageCost >= 120) return "بالا";
	if (averageCost >= 50) return "متوسط";
	return "پایین";
};

const successLabel = (averageSuccess: number | null): string => {
	if (averageSuccess === null) return "داده احتمال ثبت نشده";
	if (averageSuccess < 45) return "پایین";
	if (averageSuccess < 70) return "متوسط";
	return "بالا";
};

const formatInsightMetric = (
	value: number | null,
	suffix = "",
	fallback = "در داده‌های فعلی ثبت نشده",
): string =>
	value === null ? fallback : `${value.toLocaleString("fa-IR")}${suffix}`;

const getScenarioScore = (
	scenario: GovernmentCatalogScenario,
	actionsByCode: Record<string, GovernmentCatalogAction>,
): number => {
	const numbers = scenario.steps.map((step) =>
		readActionNumbers(actionsByCode[step.action_code]),
	);
	const avgCost = average(numbers.map((item) => item.cost)) ?? 0;
	const avgSuccess =
		average(numbers.map((item) => item.successProbability)) ?? 50;
	const reward = scenario.base_reward_points ?? 0;
	const riskPenalty =
		scenario.risk_level === "high" || scenario.risk_level === "critical"
			? 20
			: scenario.risk_level === "medium"
				? 8
				: 0;
	return avgSuccess + reward - avgCost / 8 - riskPenalty;
};

const getBestScenario = (
	scenarios: GovernmentCatalogScenario[],
	actionsByCode: Record<string, GovernmentCatalogAction>,
): GovernmentCatalogScenario | null =>
	scenarios.length === 0
		? null
		: ([...scenarios].sort(
				(first, second) =>
					getScenarioScore(second, actionsByCode) -
					getScenarioScore(first, actionsByCode),
			)[0] ?? null);

export const generateSubjectAiInsight = (
	input: SubjectAiInsightInput,
): SubjectAiInsight => {
	const { aiLevel, subject, runtimeProgress, actionsByCode } = input;
	const subSubjects: GovernmentCatalogSubSubject[] = subject.sub_subjects;
	const scenarios = flattenScenarios(subject);
	const steps = scenarios.flatMap((scenario) => scenario.steps);
	const actions = steps.map((step) => actionsByCode[step.action_code]);
	const actionNumbers = actions.map(readActionNumbers);
	const averageCost = roundMetric(
		average(actionNumbers.map((item) => item.cost)),
	);
	const averageSuccessProbability = roundMetric(
		average(actionNumbers.map((item) => item.successProbability)),
	);
	const averageCooldownTurns = roundMetric(
		average(actionNumbers.map((item) => item.cooldownTurns)),
	);
	const maxPointsOnSuccess = maxValue(
		actionNumbers.map((item) => item.pointsOnSuccess),
	);
	const requiredStepCount = steps.filter((step) => step.required).length;
	const completedSubSubjectCount = countCompletedSubSubjects(
		subject,
		runtimeProgress,
	);
	const progress =
		typeof runtimeProgress?.progress_percent === "number" &&
		Number.isFinite(runtimeProgress.progress_percent)
			? runtimeProgress.progress_percent
			: null;
	const highCriticality =
		typeof subject.criticality === "number" && subject.criticality >= 4;
	const highCostPressure =
		averageCost !== null && costPressureLabel(averageCost) === "بالا";
	const lowSuccess =
		averageSuccessProbability !== null &&
		successLabel(averageSuccessProbability) === "پایین";
	const highCooldown =
		averageCooldownTurns !== null && averageCooldownTurns >= 2;
	const complexTree = scenarios.length >= 5 || steps.length >= 15;
	const highRiskScenarios = scenarios.filter((scenario) =>
		["high", "critical"].includes((scenario.risk_level ?? "").toLowerCase()),
	);
	const attackScenarioCount = scenarios.filter(
		(scenario) => scenario.scenario_type === "attack_path",
	).length;
	const defenseScenarioCount = scenarios.filter(
		(scenario) => scenario.scenario_type === "defense_path",
	).length;
	const bestScenario = getBestScenario(scenarios, actionsByCode);
	const subjectTitle = getLocalized(subject.title, subject.title_fa);
	const analysisTier =
		aiLevel >= 3
			? "تحلیل AI استراتژیک"
			: aiLevel >= 2
				? "تحلیل AI پیشرفته"
				: "تحلیل AI سطح پایه";
	const costText = formatInsightMetric(
		averageCost,
		"",
		"هنوز هزینه‌ای برای گام‌های قابل مشاهده ثبت نشده",
	);
	const successText = formatInsightMetric(
		averageSuccessProbability,
		"٪",
		"هنوز احتمال موفقیت برای گام‌های قابل مشاهده ثبت نشده",
	);

	const headline_fa = `${analysisTier} برای ${subjectTitle}`;
	const summary_fa =
		aiLevel >= 3
			? `این موضوع برای تصمیم‌گیری تیمی به پایش مرحله‌ای نیاز دارد. ساختار آن شامل ${subSubjects.length.toLocaleString("fa-IR")} زیرموضوع، ${scenarios.length.toLocaleString("fa-IR")} سناریو و ${steps.length.toLocaleString("fa-IR")} گام قابل مشاهده است و وضعیت پیشرفت فعلی ${progressLabel(progress)} است.`
			: aiLevel >= 2
				? `میانگین هزینه کنش‌های قابل مشاهده ${costText} و میانگین احتمال موفقیت ${successText} است. از نظر پیچیدگی، این موضوع ${complexTree ? "چندمرحله‌ای و نیازمند هماهنگی بیشتر" : "قابل کنترل"} به نظر می‌رسد.`
				: `این موضوع از نظر ساختار در سطح ${complexTree ? "ریسکی" : scenarios.length >= 3 ? "متوسط" : "ساده"} قرار دارد. شامل ${subSubjects.length.toLocaleString("fa-IR")} زیرموضوع، ${scenarios.length.toLocaleString("fa-IR")} سناریو و ${steps.length.toLocaleString("fa-IR")} گام است.`;

	const strengthCandidates = compact([
		progress !== null && progress >= 67
			? "پیشرفت فعلی موضوع بالاست و ادامه مسیر می‌تواند با ریسک کمتر انجام شود."
			: null,
		averageSuccessProbability !== null && averageSuccessProbability >= 70
			? "احتمال موفقیت کنش‌های شناخته‌شده برای این موضوع مطلوب است."
			: null,
		defenseScenarioCount > attackScenarioCount
			? "تعادل سناریوها بیشتر به سمت مسیرهای دفاعی است و برای تثبیت وضعیت مناسب است."
			: attackScenarioCount > 0
				? "مسیرهای تهاجمی/فشار بازی برای این موضوع در کاتالوگ دیده می‌شود."
				: null,
		completedSubSubjectCount > 0
			? `${completedSubSubjectCount.toLocaleString("fa-IR")} زیرموضوع قبلاً تکمیل شده است.`
			: null,
	]);
	const strengths_fa = (
		strengthCandidates.length > 0
			? strengthCandidates
			: [
					"ساختار موضوع برای تحلیل AI قابل استفاده است و می‌توان مسیر تصمیم را از روی زیرموضوع‌ها و سناریوهای قابل مشاهده شروع کرد.",
				]
	).slice(0, aiLevel >= 2 ? 3 : 2);

	const riskCandidates = compact([
		highCriticality
			? "ریسک اصلی این موضوع اهمیت بالا و اثر احتمالی آن بر نتیجه بازی است."
			: null,
		highCostPressure
			? "میانگین هزینه کنش‌ها نسبتاً بالاست و ممکن است فشار اعتباری ایجاد کند."
			: null,
		lowSuccess
			? "احتمال موفقیت میانگین پایین است و انتخاب عجولانه می‌تواند نتیجه را ناپایدار کند."
			: null,
		highCooldown
			? "چند گام دارای وقفه اجرایی هستند و انعطاف تیم در نوبت‌های بعدی ممکن است کاهش یابد."
			: null,
		highRiskScenarios.length > 0
			? `${highRiskScenarios.length.toLocaleString("fa-IR")} سناریو با ریسک بالا دیده می‌شود.`
			: null,
		runtimeProgress?.status === "stalled"
			? "پیشرفت موضوع متوقف شده و احتمالاً به بازنگری مسیر یا پشتیبانی اعتباری نیاز دارد."
			: null,
		requiredStepCount > steps.length / 2 && steps.length > 0
			? "بخش زیادی از گام‌ها الزامی هستند و مسیر جایگزین کمی دیده می‌شود."
			: null,
		complexTree
			? "پراکندگی سناریوها و تعداد گام‌ها مدیریت موضوع را پیچیده‌تر می‌کند."
			: null,
	]);
	const risks_fa = (
		riskCandidates.length > 0
			? riskCandidates
			: [
					"در داده‌های فعلی ریسک فوری برجسته دیده نمی‌شود؛ با این حال قبل از انتخاب نهایی، قفل بودن گام‌ها و اعتبار تیم را دوباره بررسی کنید.",
				]
	).slice(0, aiLevel >= 3 ? 5 : aiLevel >= 2 ? 3 : 2);

	const recommended_focus_fa = compact([
		aiLevel >= 3 && bestScenario
			? `از نظر بازی، مسیر «${getLocalized(bestScenario.title, bestScenario.title_fa)}» برای شروع منطقی‌تر به نظر می‌رسد، چون نسبت هزینه، ریسک و احتمال موفقیت آن بهتر ارزیابی شده است.`
			: null,
		highCostPressure ||
		(progress !== null && progressLabel(progress) === "پایین")
			? "قبل از صدور دستور اجباری، اعتبار تیم هدف و امکان تخصیص اعتبار را بررسی کنید."
			: "تمرکز اولیه را روی سناریوهایی بگذارید که گام‌های کمتر و احتمال موفقیت بالاتر دارند.",
		aiLevel >= 2
			? "سناریوها را با معیار هزینه، احتمال موفقیت و وقفه اجرایی مقایسه کنید؛ مسیر ارزان‌تر همیشه بهترین انتخاب نیست."
			: null,
		aiLevel >= 3
			? "اگر در نوبت بعدی پیشرفت کاهش یافت یا موضوع متوقف شد، دستور دولت مانند تخصیص اعتبار، رفع ممنوعیت کنش یا تغییر تمرکز تیم را بررسی کنید."
			: null,
		aiLevel >= 3
			? "این تحلیل قطعی نیست؛ تغییر فاز بازی، اعتبار باقی‌مانده و قفل بودن گام‌ها را پیش از تصمیم نهایی دوباره بررسی کنید."
			: null,
	]).slice(0, aiLevel >= 3 ? 5 : aiLevel >= 2 ? 3 : 1);

	const confidence_label_fa =
		actions.some(Boolean) && scenarios.length > 0
			? "بالا"
			: scenarios.length > 0
				? "متوسط"
				: "پایین";

	return {
		subject_id: subject.id,
		ai_level: aiLevel,
		headline_fa,
		summary_fa,
		strengths_fa,
		risks_fa,
		recommended_focus_fa,
		key_numbers: {
			sub_subject_count: subSubjects.length,
			scenario_count: scenarios.length,
			step_count: steps.length,
			average_cost: averageCost,
			average_success_probability: averageSuccessProbability,
			max_points_on_success: maxPointsOnSuccess,
			average_cooldown_turns: averageCooldownTurns,
		},
		confidence_label_fa,
	};
};

export const formatSubjectAiInsightText = (
	insight: SubjectAiInsight,
): string => {
	const sections = [
		insight.headline_fa,
		insight.summary_fa,
		insight.strengths_fa.length > 0
			? `نکته‌های مثبت:\n${insight.strengths_fa.map((item) => `• ${item}`).join("\n")}`
			: null,
		insight.risks_fa.length > 0
			? `ریسک‌ها:\n${insight.risks_fa.map((item) => `• ${item}`).join("\n")}`
			: null,
		insight.recommended_focus_fa.length > 0
			? `پیشنهاد تمرکز:\n${insight.recommended_focus_fa.map((item) => `• ${item}`).join("\n")}`
			: null,
		"تحلیل بر اساس داده‌های بازی تولید شده است. این تحلیل قطعی نیست و فقط برای کمک به تصمیم‌گیری در بازی است.",
	];
	return compact(sections).join("\n\n");
};
