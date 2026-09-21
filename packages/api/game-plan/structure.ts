import type {
	ActionConfigRequest,
	ConfigureAllRequestV2,
	Goal,
	ImpactEffect,
	Scenario,
	ScenarioStep,
	Subject,
	SubSubject,
	TeamRequest,
} from "../game-server/types";
import type { ClientValidationIssue } from "./validation";

/**
 * Structural edits on a v2 game plan.
 *
 * The plan is stored as flat arrays joined by string ids - the shape the server
 * wants. The admin builder edits it as a tree. Everything that keeps the two in
 * step lives here: creating a child already linked to its parent, removing a
 * node together with everything under it, renaming an id without breaking the
 * references to it, and expressing a scenario's steps as moves x uses.
 *
 * Every function is pure: it takes a plan and returns a new one.
 */

export type PlanNodeKind =
	| "goal"
	| "subject"
	| "sub_subject"
	| "scenario"
	| "step";

export type PlanSide = "attack" | "defense";

export const PLAN_NODE_COLLECTION = {
	goal: "goals",
	subject: "subjects",
	sub_subject: "sub_subjects",
	scenario: "scenarios",
	step: "scenario_steps",
} as const satisfies Record<PlanNodeKind, keyof ConfigureAllRequestV2>;

export const PLAN_CHILD_KIND: Record<PlanNodeKind, PlanNodeKind | null> = {
	goal: "subject",
	subject: "sub_subject",
	sub_subject: "scenario",
	scenario: "step",
	step: null,
};

export const PLAN_PARENT_KIND: Record<PlanNodeKind, PlanNodeKind | null> = {
	goal: null,
	subject: "goal",
	sub_subject: "subject",
	scenario: "sub_subject",
	step: "scenario",
};

export const PLAN_NODE_LABEL_FA: Record<PlanNodeKind, string> = {
	goal: "هدف",
	subject: "موضوع",
	sub_subject: "زیرموضوع",
	scenario: "سناریو",
	step: "گام",
};

const clone = <T>(value: T): T =>
	typeof structuredClone === "function"
		? structuredClone(value)
		: (JSON.parse(JSON.stringify(value)) as T);

const roleType = (team: TeamRequest): string =>
	typeof team.role === "string" ? team.role : team.role.type;

/* --------------------------------------------------------------------- ids */

/** Every identifier in the plan, so a new one never collides with any of them. */
export const planIdsInUse = (plan: ConfigureAllRequestV2): Set<string> => {
	const ids = new Set<string>();
	for (const item of plan.goals) ids.add(item.id);
	for (const item of plan.subjects) ids.add(item.id);
	for (const item of plan.sub_subjects) ids.add(item.id);
	for (const item of plan.scenarios) ids.add(item.id);
	for (const item of plan.scenario_steps) ids.add(item.id);
	for (const item of plan.impact_rules) ids.add(item.id);
	for (const item of plan.actions) ids.add(item.code);
	for (const item of plan.black_market ?? []) ids.add(item.code);
	for (const item of plan.action_counters ?? []) {
		if (typeof item.id === "string") ids.add(item.id);
	}
	return ids;
};

const slug = (value: string): string =>
	value
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

/** `PREFIX_01`, `PREFIX_02`, ... - the first that is free. */
export const uniquePlanId = (prefix: string, taken: Set<string>): string => {
	const base = slug(prefix) || "ITEM";
	for (let index = 1; ; index += 1) {
		const candidate = `${base}_${String(index).padStart(2, "0")}`;
		if (!taken.has(candidate)) {
			taken.add(candidate);
			return candidate;
		}
	}
};

const stripPrefix = (id: string, prefix: string): string =>
	id.startsWith(prefix) ? id.slice(prefix.length) : id;

/* ------------------------------------------------------------------ lookup */

export const planChildrenOf = (
	plan: ConfigureAllRequestV2,
	kind: PlanNodeKind,
	id: string,
): Array<Subject | SubSubject | Scenario | ScenarioStep> => {
	switch (kind) {
		case "goal":
			return plan.subjects.filter((item) => item.goal_id === id);
		case "subject":
			return plan.sub_subjects.filter((item) => item.subject_id === id);
		case "sub_subject":
			return plan.scenarios.filter((item) => item.sub_subject_id === id);
		case "scenario":
			return plan.scenario_steps.filter((item) => item.scenario_id === id);
		default:
			return [];
	}
};

/** Goal -> subject -> sub-subject -> scenario, for a breadcrumb. */
export const planAncestry = (
	plan: ConfigureAllRequestV2,
	kind: PlanNodeKind,
	id: string,
): Array<{ kind: PlanNodeKind; id: string }> => {
	const chain: Array<{ kind: PlanNodeKind; id: string }> = [];
	let currentKind: PlanNodeKind | null = kind;
	let currentId: string | null = id;
	while (currentKind && currentId) {
		chain.unshift({ kind: currentKind, id: currentId });
		let parentId: string | null = null;
		switch (currentKind) {
			case "subject":
				parentId =
					plan.subjects.find((item) => item.id === currentId)?.goal_id ?? null;
				break;
			case "sub_subject":
				parentId =
					plan.sub_subjects.find((item) => item.id === currentId)?.subject_id ??
					null;
				break;
			case "scenario":
				parentId =
					plan.scenarios.find((item) => item.id === currentId)
						?.sub_subject_id ?? null;
				break;
			case "step":
				parentId =
					plan.scenario_steps.find((item) => item.id === currentId)
						?.scenario_id ?? null;
				break;
			default:
				parentId = null;
		}
		currentKind = PLAN_PARENT_KIND[currentKind];
		currentId = parentId;
	}
	return chain;
};

/* ---------------------------------------------------------------- removal */

export interface PlanRemoval {
	goals: string[];
	subjects: string[];
	sub_subjects: string[];
	scenarios: string[];
	steps: string[];
	/** Effects elsewhere in the plan that point at something being removed. */
	danglingEffects: number;
}

const effectsOf = (plan: ConfigureAllRequestV2): ImpactEffect[] => [
	...plan.scenario_steps.flatMap((step) => [
		...(step.on_success ?? []),
		...(step.on_failure ?? []),
	]),
	...plan.impact_rules.flatMap((rule) => rule.effects),
];

/** What removing this node would take with it. Nothing is changed. */
export const previewPlanRemoval = (
	plan: ConfigureAllRequestV2,
	kind: PlanNodeKind,
	id: string,
): PlanRemoval => {
	const goals = kind === "goal" ? [id] : [];
	const subjects =
		kind === "subject"
			? [id]
			: plan.subjects
					.filter((item) => goals.includes(item.goal_id))
					.map((item) => item.id);
	const subSubjects =
		kind === "sub_subject"
			? [id]
			: plan.sub_subjects
					.filter((item) => subjects.includes(item.subject_id))
					.map((item) => item.id);
	const scenarios =
		kind === "scenario"
			? [id]
			: plan.scenarios
					.filter((item) => subSubjects.includes(item.sub_subject_id))
					.map((item) => item.id);
	const steps =
		kind === "step"
			? [id]
			: plan.scenario_steps
					.filter((item) => scenarios.includes(item.scenario_id))
					.map((item) => item.id);

	const removed = new Set([
		...goals,
		...subjects,
		...subSubjects,
		...scenarios,
		...steps,
	]);
	const removedSteps = new Set(steps);
	// Effects carried by removed steps go with them and are not "dangling".
	const surviving = {
		...plan,
		scenario_steps: plan.scenario_steps.filter(
			(step) => !removedSteps.has(step.id),
		),
	};
	const danglingEffects = effectsOf(surviving).filter(
		(effect) => typeof effect.target === "string" && removed.has(effect.target),
	).length;

	return {
		goals,
		subjects,
		sub_subjects: subSubjects,
		scenarios,
		steps,
		danglingEffects,
	};
};

/** Removes the node and everything under it. Nothing is left orphaned. */
export const removePlanNode = (
	plan: ConfigureAllRequestV2,
	kind: PlanNodeKind,
	id: string,
): ConfigureAllRequestV2 => {
	const removal = previewPlanRemoval(plan, kind, id);
	const drop = (ids: string[]) => {
		const set = new Set(ids);
		return <T extends { id: string }>(items: T[]): T[] =>
			items.filter((item) => !set.has(item.id));
	};
	const removedSteps = new Set(removal.steps);
	return {
		...plan,
		goals: drop(removal.goals)(plan.goals),
		subjects: drop(removal.subjects)(plan.subjects),
		sub_subjects: drop(removal.sub_subjects)(plan.sub_subjects),
		scenarios: drop(removal.scenarios)(plan.scenarios),
		scenario_steps: plan.scenario_steps
			.filter((step) => !removedSteps.has(step.id))
			.map((step) =>
				step.depends_on?.some((dependency) => removedSteps.has(dependency))
					? {
							...step,
							depends_on: step.depends_on.filter(
								(dependency) => !removedSteps.has(dependency),
							),
						}
					: step,
			),
	};
};

/* ----------------------------------------------------------------- rename */

const retargetEffects = (
	effects: ImpactEffect[] | undefined,
	from: string,
	to: string,
): ImpactEffect[] | undefined =>
	effects?.map((effect) =>
		effect.target === from ? { ...effect, target: to } : effect,
	);

const retargetAllEffects = (
	plan: ConfigureAllRequestV2,
	from: string,
	to: string,
): ConfigureAllRequestV2 => ({
	...plan,
	scenario_steps: plan.scenario_steps.map((step) => ({
		...step,
		on_success: retargetEffects(step.on_success, from, to),
		on_failure: retargetEffects(step.on_failure, from, to),
	})),
	impact_rules: plan.impact_rules.map((rule) => ({
		...rule,
		effects: retargetEffects(rule.effects, from, to) ?? [],
	})),
});

export type PlanRenameResult =
	| { ok: true; plan: ConfigureAllRequestV2 }
	| { ok: false; reason: "empty" | "taken" };

/**
 * Changes a node's id and every reference to it: children's parent ids,
 * `depends_on`, and effect targets. Without this, renaming an id by hand
 * silently orphans everything underneath it.
 */
export const renamePlanNode = (
	plan: ConfigureAllRequestV2,
	kind: PlanNodeKind,
	from: string,
	rawTo: string,
): PlanRenameResult => {
	const to = rawTo.trim();
	if (!to) return { ok: false, reason: "empty" };
	if (to === from) return { ok: true, plan };
	if (planIdsInUse(plan).has(to)) return { ok: false, reason: "taken" };

	const swap = (id: string): string => (id === from ? to : id);
	let next: ConfigureAllRequestV2 = { ...plan };
	switch (kind) {
		case "goal":
			next.goals = plan.goals.map((item) => ({ ...item, id: swap(item.id) }));
			next.subjects = plan.subjects.map((item) => ({
				...item,
				goal_id: swap(item.goal_id),
			}));
			break;
		case "subject":
			next.subjects = plan.subjects.map((item) => ({
				...item,
				id: swap(item.id),
			}));
			next.sub_subjects = plan.sub_subjects.map((item) => ({
				...item,
				subject_id: swap(item.subject_id),
			}));
			break;
		case "sub_subject":
			next.sub_subjects = plan.sub_subjects.map((item) => ({
				...item,
				id: swap(item.id),
			}));
			next.scenarios = plan.scenarios.map((item) => ({
				...item,
				sub_subject_id: swap(item.sub_subject_id),
			}));
			break;
		case "scenario":
			next.scenarios = plan.scenarios.map((item) => ({
				...item,
				id: swap(item.id),
			}));
			next.scenario_steps = plan.scenario_steps.map((item) => ({
				...item,
				scenario_id: swap(item.scenario_id),
			}));
			break;
		case "step":
			next.scenario_steps = plan.scenario_steps.map((item) => ({
				...item,
				id: swap(item.id),
				depends_on: item.depends_on?.map(swap),
			}));
			break;
	}
	next = retargetAllEffects(next, from, to);
	return { ok: true, plan: next };
};

/** Renames an action code everywhere a code is used as identity. */
export const renamePlanActionCode = (
	plan: ConfigureAllRequestV2,
	from: string,
	rawTo: string,
): PlanRenameResult => {
	const to = rawTo.trim();
	if (!to) return { ok: false, reason: "empty" };
	if (to === from) return { ok: true, plan };
	if (planIdsInUse(plan).has(to)) return { ok: false, reason: "taken" };
	const swap = (code: string | null | undefined) => (code === from ? to : code);

	let next: ConfigureAllRequestV2 = {
		...plan,
		actions: plan.actions.map((action) =>
			action.code === from ? { ...action, code: to } : action,
		),
		scenario_steps: plan.scenario_steps.map((step) =>
			step.action_code === from ? { ...step, action_code: to } : step,
		),
		action_counters: plan.action_counters?.map((counter) => ({
			...counter,
			attack_code: swap(counter.attack_code) as string,
			countered_by: counter.countered_by?.map((mapping) => ({
				...mapping,
				defense_code: swap(mapping.defense_code) as string,
			})),
		})),
		black_market: plan.black_market?.map((item) =>
			item.target?.action_code === from
				? { ...item, target: { ...item.target, action_code: to } }
				: item,
		),
		impact_rules: plan.impact_rules.map((rule) =>
			rule.trigger.action_code === from
				? { ...rule, trigger: { ...rule.trigger, action_code: to } }
				: rule,
		),
	};
	if (plan.government) {
		const retarget = <
			T extends {
				banned_action_code?: string | null;
				target_action_code?: string | null;
			},
		>(
			action: T,
		): T => ({
			...action,
			banned_action_code: swap(action.banned_action_code),
			target_action_code: swap(action.target_action_code),
		});
		next = {
			...next,
			government: {
				...plan.government,
				actions: plan.government.actions?.map(retarget),
				side_governments: plan.government.side_governments.map((side) => ({
					...side,
					actions: side.actions?.map(retarget),
				})),
			},
		};
	}
	return { ok: true, plan: retargetAllEffects(next, from, to) };
};

/* ----------------------------------------------------------------- sides */

const playerTeams = (plan: ConfigureAllRequestV2): TeamRequest[] =>
	plan.teams.filter((team) => roleType(team) !== "GOVERNMENT");

/** The playing side a subject belongs to, via its owner side. */
export const planSideOfSubject = (
	plan: ConfigureAllRequestV2,
	subject: Subject | undefined,
): PlanSide | null => {
	if (!subject) return null;
	const team = playerTeams(plan).find(
		(item) => item.side_id === subject.owner_side_id,
	);
	if (!team) return null;
	const role = roleType(team);
	if (role === "ATTACKER") return "attack";
	if (role === "DEFENCER") return "defense";
	return null;
};

export const planSideOfScenario = (
	scenario: Scenario | undefined,
): PlanSide | null => {
	if (!scenario) return null;
	if (scenario.scenario_type === "attack_path") return "attack";
	if (scenario.scenario_type === "defense_path") return "defense";
	return null;
};

/** Actions a scenario of this side may use. */
export const planActionsForSide = (
	plan: ConfigureAllRequestV2,
	side: PlanSide | null,
): ActionConfigRequest[] =>
	side ? plan.actions.filter((action) => action.type === side) : plan.actions;

/* -------------------------------------------------------------- creation */

export interface PlanCreation {
	plan: ConfigureAllRequestV2;
	kind: PlanNodeKind;
	id: string;
}

export const createPlanGoal = (plan: ConfigureAllRequestV2): PlanCreation => {
	const taken = planIdsInUse(plan);
	// The playing side with the fewest goals, so a second goal lands on the
	// side that does not have one yet.
	const sides = [
		...new Set(
			playerTeams(plan).flatMap((team) =>
				team.side_id === undefined ? [] : [team.side_id],
			),
		),
	];
	const sideId =
		sides.sort(
			(a, b) =>
				plan.goals.filter((goal) => goal.side_id === a).length -
				plan.goals.filter((goal) => goal.side_id === b).length,
		)[0] ?? 0;
	const goal: Goal = {
		id: uniquePlanId("GOAL", taken),
		title: "New goal",
		title_fa: "هدف جدید",
		description: "",
		description_fa: "",
		side_id: sideId,
	};
	return {
		plan: { ...plan, goals: [...plan.goals, goal] },
		kind: "goal",
		id: goal.id,
	};
};

/**
 * A child already linked to its parent, with the fields that follow from the
 * parent filled in - the side of a subject from its goal, the path type of a
 * scenario from its side, and so on.
 */
export const createPlanChild = (
	plan: ConfigureAllRequestV2,
	parentKind: Exclude<PlanNodeKind, "step">,
	parentId: string,
): PlanCreation => {
	const taken = planIdsInUse(plan);
	switch (parentKind) {
		case "goal": {
			const goal = plan.goals.find((item) => item.id === parentId);
			const ownerSide = goal?.side_id ?? 0;
			const target = playerTeams(plan).find(
				(team) => team.side_id !== ownerSide,
			);
			const subject: Subject = {
				id: uniquePlanId(`SUBJ_${stripPrefix(parentId, "GOAL_")}`, taken),
				goal_id: parentId,
				title: "New subject",
				title_fa: "موضوع جدید",
				subject_type: "critical_infrastructure",
				target_team_id: target?.id ?? 0,
				owner_side_id: ownerSide,
				criticality: 3,
				mitre_mapping: {},
			};
			return {
				plan: { ...plan, subjects: [...plan.subjects, subject] },
				kind: "subject",
				id: subject.id,
			};
		}
		case "subject": {
			const used = plan.sub_subjects
				.filter((item) => item.subject_id === parentId)
				.reduce((sum, item) => sum + item.progress_share, 0);
			const sibling = plan.sub_subjects.find(
				(item) => item.subject_id === parentId,
			);
			const subSubject: SubSubject = {
				id: uniquePlanId(`SS_${stripPrefix(parentId, "SUBJ_")}`, taken),
				subject_id: parentId,
				title: "New sub-subject",
				title_fa: "زیرموضوع جدید",
				progress_share: Math.max(0, 100 - used),
				source: clone(sibling?.source ?? {}),
				completion_rule: clone(sibling?.completion_rule ?? {}),
			};
			return {
				plan: { ...plan, sub_subjects: [...plan.sub_subjects, subSubject] },
				kind: "sub_subject",
				id: subSubject.id,
			};
		}
		case "sub_subject": {
			const subSubject = plan.sub_subjects.find((item) => item.id === parentId);
			const subject = plan.subjects.find(
				(item) => item.id === subSubject?.subject_id,
			);
			const side = planSideOfSubject(plan, subject) ?? "attack";
			const scenario: Scenario = {
				id: uniquePlanId(`SCN_${stripPrefix(parentId, "SS_")}`, taken),
				sub_subject_id: parentId,
				title: "New scenario",
				title_fa: "سناریوی جدید",
				scenario_type: side === "attack" ? "attack_path" : "defense_path",
				scenario_type_fa: side === "attack" ? "مسیر تهاجمی" : "مسیر دفاعی",
				execution_mode: "checklist",
				allowed_team_roles: [side === "attack" ? "ATTACKER" : "DEFENCER"],
				base_reward_points: 0,
				base_credit_cost: 0,
				risk_level: "medium",
				risk_level_fa: "متوسط",
			};
			return {
				plan: { ...plan, scenarios: [...plan.scenarios, scenario] },
				kind: "scenario",
				id: scenario.id,
			};
		}
		case "scenario": {
			const scenario = plan.scenarios.find((item) => item.id === parentId);
			const siblings = plan.scenario_steps.filter(
				(item) => item.scenario_id === parentId,
			);
			const action = planActionsForSide(plan, planSideOfScenario(scenario))[0];
			const step: ScenarioStep = {
				id: uniquePlanId(
					`STEP_${stripPrefix(parentId, "SCN_")}_${stripPrefix(stripPrefix(action?.code ?? "MOVE", "ATK_"), "DEF_")}`,
					taken,
				),
				scenario_id: parentId,
				order:
					siblings.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1,
				action_code: action?.code ?? "",
				required: scenario?.execution_mode === "ordered",
				depends_on: [],
				on_success: [],
				on_failure: [],
			};
			return {
				plan: { ...plan, scenario_steps: [...plan.scenario_steps, step] },
				kind: "step",
				id: step.id,
			};
		}
	}
};

/* ---------------------------------------------------------------- shares */

/** Splits 100 evenly across a subject's sub-subjects; the remainder goes first. */
export const balancePlanShares = (
	plan: ConfigureAllRequestV2,
	subjectId: string,
): ConfigureAllRequestV2 => {
	const children = plan.sub_subjects.filter(
		(item) => item.subject_id === subjectId,
	);
	if (children.length === 0) return plan;
	const base = Math.floor(100 / children.length);
	let remainder = 100 - base * children.length;
	const shares = new Map<string, number>();
	for (const child of children) {
		shares.set(child.id, base + (remainder > 0 ? 1 : 0));
		remainder -= 1;
	}
	return {
		...plan,
		sub_subjects: plan.sub_subjects.map((item) =>
			shares.has(item.id)
				? { ...item, progress_share: shares.get(item.id) as number }
				: item,
		),
	};
};

export const planShareTotal = (
	plan: ConfigureAllRequestV2,
	subjectId: string,
): number =>
	plan.sub_subjects
		.filter((item) => item.subject_id === subjectId)
		.reduce((sum, item) => sum + item.progress_share, 0);

/* ------------------------------------------------------ moves x uses grid */

/**
 * A checklist scenario stores "this move can be played N times" as N copies of
 * the same step - the engine consumes a step when it resolves. The builder
 * edits that as one row per move with a use count.
 */
export interface ScenarioMoveRow {
	actionCode: string;
	stepIds: string[];
	/** ADVANCE_PROGRESS on this scenario's sub-subject, from the first step. */
	progress: number | null;
}

const isProgressOn =
	(target: string) =>
	(effect: ImpactEffect): boolean =>
		effect.type === "ADVANCE_PROGRESS" && effect.target === target;

const sortedSteps = (steps: ScenarioStep[]): ScenarioStep[] =>
	[...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const scenarioMoveRows = (
	plan: ConfigureAllRequestV2,
	scenarioId: string,
): ScenarioMoveRow[] => {
	const scenario = plan.scenarios.find((item) => item.id === scenarioId);
	const rows = new Map<string, ScenarioMoveRow>();
	for (const step of sortedSteps(
		plan.scenario_steps.filter((item) => item.scenario_id === scenarioId),
	)) {
		let row = rows.get(step.action_code);
		if (!row) {
			const effect = scenario
				? step.on_success?.find(isProgressOn(scenario.sub_subject_id))
				: undefined;
			row = {
				actionCode: step.action_code,
				stepIds: [],
				progress: typeof effect?.value === "number" ? effect.value : null,
			};
			rows.set(step.action_code, row);
		}
		row.stepIds.push(step.id);
	}
	return [...rows.values()];
};

/**
 * Renumbers a checklist scenario round by round - every move once, then every
 * move again - which is the order the moves are offered in.
 */
const renumberRoundRobin = (
	plan: ConfigureAllRequestV2,
	scenarioId: string,
): ConfigureAllRequestV2 => {
	const rows = scenarioMoveRows(plan, scenarioId);
	const order = new Map<string, number>();
	let next = 1;
	const rounds = rows.reduce(
		(max, row) => Math.max(max, row.stepIds.length),
		0,
	);
	for (let round = 0; round < rounds; round += 1) {
		for (const row of rows) {
			const id = row.stepIds[round];
			if (id) order.set(id, next++);
		}
	}
	return {
		...plan,
		scenario_steps: plan.scenario_steps.map((step) =>
			order.has(step.id) ? { ...step, order: order.get(step.id) } : step,
		),
	};
};

/** A template for a move not yet in this scenario, borrowed from elsewhere. */
const templateStepFor = (
	plan: ConfigureAllRequestV2,
	actionCode: string,
	subSubjectId: string,
): Pick<ScenarioStep, "on_success" | "on_failure" | "required"> => {
	for (const step of plan.scenario_steps) {
		if (step.action_code !== actionCode) continue;
		const owner = plan.scenarios.find((item) => item.id === step.scenario_id);
		const from = owner?.sub_subject_id;
		const retarget = (effects: ImpactEffect[] | undefined) =>
			(effects ?? []).map((effect) =>
				from && effect.target === from
					? { ...effect, target: subSubjectId }
					: { ...effect },
			);
		return {
			on_success: retarget(step.on_success),
			on_failure: retarget(step.on_failure),
			required: step.required ?? false,
		};
	}
	return { on_success: [], on_failure: [], required: false };
};

export const setScenarioMoveUses = (
	plan: ConfigureAllRequestV2,
	scenarioId: string,
	actionCode: string,
	rawUses: number,
): ConfigureAllRequestV2 => {
	const scenario = plan.scenarios.find((item) => item.id === scenarioId);
	if (!scenario) return plan;
	const uses = Math.max(0, Math.floor(rawUses));
	const existing = sortedSteps(
		plan.scenario_steps.filter(
			(item) =>
				item.scenario_id === scenarioId && item.action_code === actionCode,
		),
	);
	let next = plan;
	if (uses < existing.length) {
		const removed = new Set(existing.slice(uses).map((step) => step.id));
		next = {
			...plan,
			scenario_steps: plan.scenario_steps
				.filter((step) => !removed.has(step.id))
				.map((step) =>
					step.depends_on?.some((id) => removed.has(id))
						? {
								...step,
								depends_on: step.depends_on.filter((id) => !removed.has(id)),
							}
						: step,
				),
		};
	} else if (uses > existing.length) {
		const taken = planIdsInUse(plan);
		const last = existing.at(-1);
		const template = last
			? {
					on_success: clone(last.on_success ?? []),
					on_failure: clone(last.on_failure ?? []),
					required: last.required ?? false,
				}
			: templateStepFor(plan, actionCode, scenario.sub_subject_id);
		const prefix = `STEP_${stripPrefix(scenarioId, "SCN_")}_${stripPrefix(stripPrefix(actionCode, "ATK_"), "DEF_")}`;
		// New copies go after everything already there, so a move added later
		// also comes later in each round.
		let order = plan.scenario_steps
			.filter((item) => item.scenario_id === scenarioId)
			.reduce((max, item) => Math.max(max, item.order ?? 0), 0);
		const added: ScenarioStep[] = [];
		for (let index = existing.length; index < uses; index += 1) {
			order += 1;
			added.push({
				id: uniquePlanId(prefix, taken),
				scenario_id: scenarioId,
				order,
				action_code: actionCode,
				required: template.required,
				depends_on: [],
				on_success: clone(template.on_success),
				on_failure: clone(template.on_failure),
			});
		}
		next = { ...plan, scenario_steps: [...plan.scenario_steps, ...added] };
	}
	return scenario.execution_mode === "checklist"
		? renumberRoundRobin(next, scenarioId)
		: next;
};

/** Sets, or with `null` removes, the progress a successful move gives. */
export const setScenarioMoveProgress = (
	plan: ConfigureAllRequestV2,
	scenarioId: string,
	actionCode: string,
	value: number | null,
): ConfigureAllRequestV2 => {
	const scenario = plan.scenarios.find((item) => item.id === scenarioId);
	if (!scenario) return plan;
	const matches = isProgressOn(scenario.sub_subject_id);
	return {
		...plan,
		scenario_steps: plan.scenario_steps.map((step) => {
			if (step.scenario_id !== scenarioId || step.action_code !== actionCode)
				return step;
			const rest = (step.on_success ?? []).filter((effect) => !matches(effect));
			return {
				...step,
				on_success:
					value === null
						? rest
						: [
								{
									type: "ADVANCE_PROGRESS",
									target: scenario.sub_subject_id,
									value,
								},
								...rest,
							],
			};
		}),
	};
};

/** Moves a step one place earlier or later within its scenario. */
export const moveScenarioStep = (
	plan: ConfigureAllRequestV2,
	stepId: string,
	delta: -1 | 1,
): ConfigureAllRequestV2 => {
	const step = plan.scenario_steps.find((item) => item.id === stepId);
	if (!step) return plan;
	const siblings = sortedSteps(
		plan.scenario_steps.filter((item) => item.scenario_id === step.scenario_id),
	);
	const index = siblings.findIndex((item) => item.id === stepId);
	const target = index + delta;
	if (target < 0 || target >= siblings.length) return plan;
	const reordered = [...siblings];
	[reordered[index], reordered[target]] = [
		reordered[target] as ScenarioStep,
		reordered[index] as ScenarioStep,
	];
	const order = new Map(
		reordered.map((item, position) => [item.id, position + 1]),
	);
	return {
		...plan,
		scenario_steps: plan.scenario_steps.map((item) =>
			order.has(item.id) ? { ...item, order: order.get(item.id) } : item,
		),
	};
};

/**
 * One click for a whole lane under a subject: a sub-subject, its scenario,
 * and every move of that side playable once per turn.
 */
export const scaffoldPlanLane = (
	plan: ConfigureAllRequestV2,
	subjectId: string,
): {
	plan: ConfigureAllRequestV2;
	subSubjectId: string;
	scenarioId: string;
} => {
	const withSubSubject = createPlanChild(plan, "subject", subjectId);
	const withScenario = createPlanChild(
		withSubSubject.plan,
		"sub_subject",
		withSubSubject.id,
	);
	const scenario = withScenario.plan.scenarios.find(
		(item) => item.id === withScenario.id,
	);
	const uses = Math.max(1, plan.game_config.num_turns || 1);
	let next = withScenario.plan;
	for (const action of planActionsForSide(next, planSideOfScenario(scenario))) {
		next = setScenarioMoveUses(next, withScenario.id, action.code, uses);
	}
	return {
		plan: next,
		subSubjectId: withSubSubject.id,
		scenarioId: withScenario.id,
	};
};

/* ---------------------------------------------------------------- arsenal */

export interface PlanActionUsage {
	steps: number;
	scenarios: number;
	counters: number;
	blackMarket: string[];
	impactRules: number;
}

export const planActionUsage = (
	plan: ConfigureAllRequestV2,
	code: string,
): PlanActionUsage => {
	const steps = plan.scenario_steps.filter((step) => step.action_code === code);
	return {
		steps: steps.length,
		scenarios: new Set(steps.map((step) => step.scenario_id)).size,
		counters: (plan.action_counters ?? []).filter(
			(counter) =>
				counter.attack_code === code ||
				counter.countered_by?.some((mapping) => mapping.defense_code === code),
		).length,
		blackMarket: (plan.black_market ?? [])
			.filter((item) => item.target?.action_code === code)
			.map((item) => item.code),
		impactRules: plan.impact_rules.filter(
			(rule) => rule.trigger.action_code === code,
		).length,
	};
};

/**
 * Removes an action with its steps and counter entries. Black-market items and
 * impact rules that name it are left for the caller to refuse on, because
 * silently rewriting a purchasable item is worse than asking.
 */
export const removePlanAction = (
	plan: ConfigureAllRequestV2,
	code: string,
): ConfigureAllRequestV2 => {
	const removedSteps = new Set(
		plan.scenario_steps
			.filter((step) => step.action_code === code)
			.map((step) => step.id),
	);
	return {
		...plan,
		actions: plan.actions.filter((action) => action.code !== code),
		scenario_steps: plan.scenario_steps
			.filter((step) => !removedSteps.has(step.id))
			.map((step) =>
				step.depends_on?.some((id) => removedSteps.has(id))
					? {
							...step,
							depends_on: step.depends_on.filter((id) => !removedSteps.has(id)),
						}
					: step,
			),
		action_counters: (plan.action_counters ?? [])
			.filter((counter) => counter.attack_code !== code)
			.map((counter) => ({
				...counter,
				countered_by: counter.countered_by?.filter(
					(mapping) => mapping.defense_code !== code,
				),
			})),
	};
};

export const createPlanAction = (
	plan: ConfigureAllRequestV2,
	type: "attack" | "defense",
): { plan: ConfigureAllRequestV2; code: string } => {
	const taken = planIdsInUse(plan);
	const code = uniquePlanId(type === "attack" ? "ATK_NEW" : "DEF_NEW", taken);
	const role = type === "attack" ? "ATTACKER" : "DEFENCER";
	const teamIds = playerTeams(plan)
		.filter((team) => roleType(team) === role)
		.flatMap((team) => (team.id === undefined ? [] : [team.id]));
	const action: ActionConfigRequest = {
		code,
		name: type === "attack" ? "New attack" : "New defence",
		name_fa: type === "attack" ? "حرکت تهاجمی جدید" : "حرکت دفاعی جدید",
		type,
		type_fa: type === "attack" ? "تهاجمی" : "دفاعی",
		description: "",
		description_fa: "",
		base_stats: {
			cost: 10,
			success_probability: 50,
			points_on_success: 2,
			cooldown_turns: 0,
		},
		requirements: {
			unlocked_by_default: true,
			allowed_team_ids: teamIds,
			allowed_team_roles: [role],
			prerequisites: [],
		},
		effects: {},
		visual: {},
	};
	return { plan: { ...plan, actions: [...plan.actions, action] }, code };
};

/** Sets, or with `null` removes, how well a defence counters an attack. */
export const setPlanCounter = (
	plan: ConfigureAllRequestV2,
	attackCode: string,
	defenseCode: string,
	effectiveness: number | null,
): ConfigureAllRequestV2 => {
	const counters = [...(plan.action_counters ?? [])];
	const index = counters.findIndex(
		(counter) => counter.attack_code === attackCode,
	);
	if (index === -1) {
		if (effectiveness === null) return plan;
		counters.push({
			id: uniquePlanId(
				`COUNTER_${stripPrefix(attackCode, "ATK_")}`,
				planIdsInUse(plan),
			),
			attack_code: attackCode,
			countered_by: [{ defense_code: defenseCode, effectiveness }],
		});
		return { ...plan, action_counters: counters };
	}
	const counter = counters[index] as (typeof counters)[number];
	const mappings = (counter.countered_by ?? []).filter(
		(mapping) => mapping.defense_code !== defenseCode,
	);
	const existing = counter.countered_by?.find(
		(mapping) => mapping.defense_code === defenseCode,
	);
	if (effectiveness !== null) {
		mappings.push({ ...existing, defense_code: defenseCode, effectiveness });
	}
	counters[index] = { ...counter, countered_by: mappings };
	return { ...plan, action_counters: counters };
};

export const planCounterValue = (
	plan: ConfigureAllRequestV2,
	attackCode: string,
	defenseCode: string,
): number | null => {
	const mapping = plan.action_counters
		?.find((counter) => counter.attack_code === attackCode)
		?.countered_by?.find((item) => item.defense_code === defenseCode);
	return typeof mapping?.effectiveness === "number"
		? mapping.effectiveness
		: null;
};

/* ------------------------------------------------------------ live issues */

/**
 * Client issues keyed by the id they are about. The client validator puts the
 * entity id in `loc`, so a tree node can show its own problems while the
 * admin is still editing, instead of after pressing "validate".
 */
export const planIssuesById = (
	issues: ClientValidationIssue[],
): Map<string, ClientValidationIssue[]> => {
	const map = new Map<string, ClientValidationIssue[]>();
	for (const issue of issues) {
		const list = map.get(issue.loc) ?? [];
		list.push(issue);
		map.set(issue.loc, list);
	}
	return map;
};
