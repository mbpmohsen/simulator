import type {
	GovernmentCatalogAction,
	GovernmentCatalogGoal,
	GovernmentCatalogResponse,
	GovernmentCatalogScenario,
	GovernmentCatalogStep,
	GovernmentCatalogSubject,
	GovernmentCatalogSubSubject,
	GovernmentCatalogTeam,
	GovernmentOrder,
	GovernmentOrderType,
	TeamRoleType,
} from "../game-server/types";

type UnknownRecord = Record<string, unknown>;

export type GovernmentCatalogNodeType =
	| "subject"
	| "sub_subject"
	| "scenario"
	| "step"
	| "action";

export interface GovernmentCatalogNodeOption {
	id: string;
	type: GovernmentCatalogNodeType;
	label: string;
	searchText: string;
	actionCode?: string;
}

export interface GovernmentCatalogStats {
	goals: number;
	subjects: number;
	teams: number;
	actions: number;
	scenarios: number;
	steps: number;
}

export interface GovernmentCatalogValidationResult {
	valid: boolean;
	message: string;
}

export const GOVERNMENT_CATALOG_LABELS_FA = {
	catalog: "کاتالوگ دولت",
	availableGoals: "هدف‌های قابل انتخاب",
	assignableSubjects: "موضوع‌های قابل تخصیص",
	sideTeams: "تیم‌های سمت شما",
	bannableActions: "کنش‌های قابل ممنوعیت",
	orderTargetTeam: "تیم هدف دستور",
	subject: "موضوع",
	action: "کنش",
	node: "گره",
	loadCatalog: "دریافت کاتالوگ",
	refreshCatalog: "به‌روزرسانی کاتالوگ",
	catalogUnavailable: "کاتالوگ در دسترس نیست",
	subjectUnavailable: "این موضوع در کاتالوگ سمت شما وجود ندارد.",
	actionUnavailable: "این کنش برای سمت شما قابل ممنوع‌کردن نیست.",
} as const;

const asRecord = (value: unknown): UnknownRecord | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;

const firstValue = (
	record: UnknownRecord,
	keys: readonly string[],
): unknown => {
	for (const key of keys) {
		if (record[key] !== undefined) return record[key];
	}
	return undefined;
};

const asArray = (value: unknown): unknown[] => {
	if (Array.isArray(value)) return value;
	const record = asRecord(value);
	return record ? Object.values(record) : [];
};

const arrayField = (
	record: UnknownRecord,
	keys: readonly string[],
): unknown[] => asArray(firstValue(record, keys));

const stringField = (
	record: UnknownRecord,
	keys: readonly string[],
	fallback = "",
): string => {
	const value = firstValue(record, keys);
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return fallback;
};

const optionalStringField = (
	record: UnknownRecord,
	keys: readonly string[],
): string | null | undefined => {
	const value = firstValue(record, keys);
	if (value === null) return null;
	if (typeof value === "string") return value.trim() || null;
	return undefined;
};

const numberField = (
	record: UnknownRecord,
	keys: readonly string[],
	fallback = 0,
): number => {
	const value = Number(firstValue(record, keys));
	return Number.isFinite(value) ? value : fallback;
};

const optionalNumberField = (
	record: UnknownRecord,
	keys: readonly string[],
): number | null | undefined => {
	const raw = firstValue(record, keys);
	if (raw === null) return null;
	if (raw === undefined || raw === "") return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
};

const booleanField = (
	record: UnknownRecord,
	keys: readonly string[],
	fallback: boolean,
): boolean => {
	const value = firstValue(record, keys);
	return typeof value === "boolean" ? value : fallback;
};

const withParentId = (
	value: unknown,
	keys: readonly string[],
	field: string,
	parentId: string,
): unknown => {
	const record = asRecord(value);
	if (!record || firstValue(record, keys) !== undefined) return value;
	return { ...record, [field]: parentId };
};

const roleValues: readonly TeamRoleType[] = [
	"ATTACKER",
	"DEFENCER",
	"BOTH",
	"GOVERNMENT",
];

const normalizeRole = (value: unknown): TeamRoleType | undefined => {
	const record = asRecord(value);
	const role = String(record?.type ?? value ?? "").toUpperCase();
	return roleValues.includes(role as TeamRoleType)
		? (role as TeamRoleType)
		: undefined;
};

const uniqueById = <T extends { id: string | number }>(values: T[]): T[] => [
	...new Map(values.map((value) => [value.id, value])).values(),
];

const mergeById = <T extends { id: string }>(
	primary: T[],
	secondary: T[],
	merge: (current: T, incoming: T) => T,
): T[] => {
	const result = new Map(primary.map((value) => [value.id, value]));
	for (const value of secondary) {
		const current = result.get(value.id);
		result.set(value.id, current ? merge(current, value) : value);
	}
	return [...result.values()];
};

export const normalizeGovernmentCatalogGoal = (
	value: unknown,
): GovernmentCatalogGoal | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = stringField(record, ["id", "goal_id", "goalId"]);
	if (!id) return null;
	return {
		id,
		title: stringField(record, ["title", "name"], id),
		title_fa: optionalStringField(record, ["title_fa", "titleFa", "name_fa"]),
		description: optionalStringField(record, ["description"]),
		description_fa: optionalStringField(record, [
			"description_fa",
			"descriptionFa",
		]),
		side_id: optionalNumberField(record, ["side_id", "sideId"]) ?? undefined,
	};
};

export const normalizeGovernmentCatalogStep = (
	value: unknown,
): GovernmentCatalogStep | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = stringField(record, ["id", "step_id", "stepId"]);
	const scenarioId = stringField(record, ["scenario_id", "scenarioId"]);
	const actionCode = stringField(record, ["action_code", "actionCode", "code"]);
	if (!id || !scenarioId) return null;
	return {
		id,
		scenario_id: scenarioId,
		order: optionalNumberField(record, ["order"]),
		action_code: actionCode,
		required: booleanField(record, ["required"], true),
	};
};

export const normalizeGovernmentCatalogScenario = (
	value: unknown,
): GovernmentCatalogScenario | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = stringField(record, ["id", "scenario_id", "scenarioId"]);
	const subSubjectId = stringField(record, ["sub_subject_id", "subSubjectId"]);
	if (!id || !subSubjectId) return null;
	const rawType = stringField(record, ["scenario_type", "scenarioType"]);
	const scenarioType =
		rawType === "defense_path" ? "defense_path" : "attack_path";
	const rawMode = stringField(record, ["execution_mode", "executionMode"]);
	const executionMode = ["ordered", "checklist", "branching"].includes(rawMode)
		? (rawMode as GovernmentCatalogScenario["execution_mode"])
		: "ordered";
	const allowedRoles = arrayField(record, [
		"allowed_team_roles",
		"allowedTeamRoles",
	])
		.map(normalizeRole)
		.filter((role): role is "ATTACKER" | "DEFENCER" | "BOTH" =>
			Boolean(role && role !== "GOVERNMENT"),
		);
	return {
		id,
		sub_subject_id: subSubjectId,
		title: stringField(record, ["title", "name"], id),
		title_fa: optionalStringField(record, ["title_fa", "titleFa", "name_fa"]),
		scenario_type: scenarioType,
		execution_mode: executionMode,
		allowed_team_roles: allowedRoles.length > 0 ? allowedRoles : undefined,
		steps: arrayField(record, ["steps", "scenario_steps", "scenarioSteps"])
			.map(normalizeGovernmentCatalogStep)
			.filter((step): step is GovernmentCatalogStep => step !== null),
	};
};

export const normalizeGovernmentCatalogSubSubject = (
	value: unknown,
): GovernmentCatalogSubSubject | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = stringField(record, ["id", "sub_subject_id", "subSubjectId"]);
	const subjectId = stringField(record, ["subject_id", "subjectId"]);
	if (!id || !subjectId) return null;
	return {
		id,
		subject_id: subjectId,
		title: stringField(record, ["title", "name"], id),
		title_fa: optionalStringField(record, ["title_fa", "titleFa", "name_fa"]),
		progress_share: numberField(record, ["progress_share", "progressShare"]),
		scenarios: arrayField(record, ["scenarios"])
			.map(normalizeGovernmentCatalogScenario)
			.filter(
				(scenario): scenario is GovernmentCatalogScenario => scenario !== null,
			),
	};
};

export const normalizeGovernmentCatalogSubject = (
	value: unknown,
): GovernmentCatalogSubject | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = stringField(record, ["id", "subject_id", "subjectId"]);
	const goalId = stringField(record, ["goal_id", "goalId"]);
	if (!id || !goalId) return null;
	const rawType = stringField(record, ["subject_type", "subjectType"]);
	const subjectType = [
		"mitre_technique",
		"asset",
		"critical_infrastructure",
	].includes(rawType)
		? (rawType as GovernmentCatalogSubject["subject_type"])
		: "asset";
	return {
		id,
		goal_id: goalId,
		title: stringField(record, ["title", "name"], id),
		title_fa: optionalStringField(record, ["title_fa", "titleFa", "name_fa"]),
		description: optionalStringField(record, ["description"]),
		description_fa: optionalStringField(record, [
			"description_fa",
			"descriptionFa",
		]),
		subject_type: subjectType,
		target_team_id: numberField(record, ["target_team_id", "targetTeamId"]),
		owner_side_id: numberField(record, ["owner_side_id", "ownerSideId"]),
		criticality: optionalNumberField(record, ["criticality"]),
		sub_subjects: arrayField(record, ["sub_subjects", "subSubjects"])
			.map(normalizeGovernmentCatalogSubSubject)
			.filter(
				(subSubject): subSubject is GovernmentCatalogSubSubject =>
					subSubject !== null,
			),
	};
};

export const normalizeGovernmentCatalogTeam = (
	value: unknown,
): GovernmentCatalogTeam | null => {
	const record = asRecord(value);
	if (!record) return null;
	const id = numberField(record, ["id", "team_id", "teamId"]);
	if (!Number.isSafeInteger(id) || id <= 0) return null;
	const role = normalizeRole(
		firstValue(record, ["role", "team_role", "teamRole"]),
	);
	return {
		id,
		name: stringField(
			record,
			["name", "display_name", "displayName"],
			`تیم ${id}`,
		),
		name_fa: optionalStringField(record, ["name_fa", "nameFa"]),
		display_name: optionalStringField(record, ["display_name", "displayName"]),
		display_name_fa: optionalStringField(record, [
			"display_name_fa",
			"displayNameFa",
		]),
		side_id: numberField(record, ["side_id", "sideId"]),
		role: role ? { type: role } : undefined,
	};
};

export const normalizeGovernmentCatalogAction = (
	value: unknown,
): GovernmentCatalogAction | null => {
	const record = asRecord(value);
	if (!record) return null;
	const code = stringField(record, [
		"code",
		"action_code",
		"actionCode",
		"name",
	]);
	if (!code) return null;
	const rawType = stringField(record, ["type", "action_type", "category"]);
	const type =
		rawType.toLowerCase() === "defense" || code.toUpperCase().startsWith("DEF_")
			? "defense"
			: "attack";
	return {
		code,
		name: stringField(record, ["name", "display_name", "displayName"], code),
		name_fa: optionalStringField(record, [
			"name_fa",
			"nameFa",
			"display_name_fa",
		]),
		description: optionalStringField(record, ["description"]),
		description_fa: optionalStringField(record, [
			"description_fa",
			"descriptionFa",
		]),
		type,
	};
};

export const normalizeGovernmentCatalog = (
	value: unknown,
): GovernmentCatalogResponse => {
	const envelope = asRecord(value) ?? {};
	const root = asRecord(envelope.data) ?? envelope;
	const rawGoals = arrayField(root, ["goals"]);
	const rawSubjects = [
		...arrayField(root, ["subjects"]),
		...rawGoals.flatMap((goal) => {
			const goalRecord = asRecord(goal) ?? {};
			const goalId = stringField(goalRecord, ["id", "goal_id", "goalId"]);
			return arrayField(goalRecord, ["subjects"]).map((subject) =>
				withParentId(subject, ["goal_id", "goalId"], "goal_id", goalId),
			);
		}),
	];
	const rawSubSubjects = [
		...arrayField(root, ["sub_subjects", "subSubjects"]),
		...rawSubjects.flatMap((subject) => {
			const subjectRecord = asRecord(subject) ?? {};
			const subjectId = stringField(subjectRecord, [
				"id",
				"subject_id",
				"subjectId",
			]);
			return arrayField(subjectRecord, ["sub_subjects", "subSubjects"]).map(
				(subSubject) =>
					withParentId(
						subSubject,
						["subject_id", "subjectId"],
						"subject_id",
						subjectId,
					),
			);
		}),
	];
	const rawScenarios = [
		...arrayField(root, ["scenarios"]),
		...rawSubSubjects.flatMap((subSubject) => {
			const subSubjectRecord = asRecord(subSubject) ?? {};
			const subSubjectId = stringField(subSubjectRecord, [
				"id",
				"sub_subject_id",
				"subSubjectId",
			]);
			return arrayField(subSubjectRecord, ["scenarios"]).map((scenario) =>
				withParentId(
					scenario,
					["sub_subject_id", "subSubjectId"],
					"sub_subject_id",
					subSubjectId,
				),
			);
		}),
	];
	const rawSteps = [
		...arrayField(root, ["scenario_steps", "scenarioSteps", "steps"]),
		...rawScenarios.flatMap((scenario) => {
			const scenarioRecord = asRecord(scenario) ?? {};
			const scenarioId = stringField(scenarioRecord, [
				"id",
				"scenario_id",
				"scenarioId",
			]);
			return arrayField(scenarioRecord, [
				"steps",
				"scenario_steps",
				"scenarioSteps",
			]).map((step) =>
				withParentId(
					step,
					["scenario_id", "scenarioId"],
					"scenario_id",
					scenarioId,
				),
			);
		}),
	];

	const normalizedSteps = uniqueById(
		rawSteps
			.map(normalizeGovernmentCatalogStep)
			.filter((step): step is GovernmentCatalogStep => step !== null),
	);
	const normalizedScenarios = mergeById(
		[],
		rawScenarios
			.map(normalizeGovernmentCatalogScenario)
			.filter(
				(scenario): scenario is GovernmentCatalogScenario => scenario !== null,
			),
		(current, incoming) => ({
			...current,
			...incoming,
			steps: uniqueById([...current.steps, ...incoming.steps]),
		}),
	).map((scenario) => ({
		...scenario,
		steps: uniqueById([
			...scenario.steps,
			...normalizedSteps.filter((step) => step.scenario_id === scenario.id),
		]).sort((first, second) => (first.order ?? 0) - (second.order ?? 0)),
	}));
	const normalizedSubSubjects = mergeById(
		[],
		rawSubSubjects
			.map(normalizeGovernmentCatalogSubSubject)
			.filter(
				(subSubject): subSubject is GovernmentCatalogSubSubject =>
					subSubject !== null,
			),
		(current, incoming) => ({
			...current,
			...incoming,
			scenarios: mergeById(
				current.scenarios,
				incoming.scenarios,
				(first, second) => ({
					...first,
					...second,
					steps: uniqueById([...first.steps, ...second.steps]),
				}),
			),
		}),
	).map((subSubject) => ({
		...subSubject,
		scenarios: mergeById(
			subSubject.scenarios,
			normalizedScenarios.filter(
				(scenario) => scenario.sub_subject_id === subSubject.id,
			),
			(first, second) => ({
				...first,
				...second,
				steps: uniqueById([...first.steps, ...second.steps]),
			}),
		),
	}));
	const subjects = mergeById(
		[],
		rawSubjects
			.map(normalizeGovernmentCatalogSubject)
			.filter(
				(subject): subject is GovernmentCatalogSubject => subject !== null,
			),
		(current, incoming) => ({
			...current,
			...incoming,
			sub_subjects: mergeById(
				current.sub_subjects,
				incoming.sub_subjects,
				(first, second) => ({
					...first,
					...second,
					scenarios: mergeById(first.scenarios, second.scenarios, (a, b) => ({
						...a,
						...b,
						steps: uniqueById([...a.steps, ...b.steps]),
					})),
				}),
			),
		}),
	).map((subject) => ({
		...subject,
		sub_subjects: mergeById(
			subject.sub_subjects,
			normalizedSubSubjects.filter(
				(subSubject) => subSubject.subject_id === subject.id,
			),
			(first, second) => ({
				...first,
				...second,
				scenarios: mergeById(first.scenarios, second.scenarios, (a, b) => ({
					...a,
					...b,
					steps: uniqueById([...a.steps, ...b.steps]),
				})),
			}),
		),
	}));

	return {
		side_id: numberField(root, ["side_id", "sideId"]),
		government_team_id:
			optionalNumberField(root, ["government_team_id", "governmentTeamId"]) ??
			undefined,
		goals: uniqueById(
			rawGoals
				.map(normalizeGovernmentCatalogGoal)
				.filter((goal): goal is GovernmentCatalogGoal => goal !== null),
		),
		subjects,
		teams: uniqueById(
			arrayField(root, ["teams", "side_teams", "sideTeams"])
				.map(normalizeGovernmentCatalogTeam)
				.filter((team): team is GovernmentCatalogTeam => team !== null),
		),
		bannable_actions: uniqueById(
			arrayField(root, ["bannable_actions", "bannableActions", "actions"])
				.map(normalizeGovernmentCatalogAction)
				.filter((action): action is GovernmentCatalogAction => action !== null)
				.map((action) => ({ ...action, id: action.code })),
		).map(({ id: _id, ...action }) => action),
	};
};

export const getGovernmentCatalogGoalLabel = (
	goal: GovernmentCatalogGoal,
): string => goal.title_fa || goal.title;

export const getGovernmentCatalogSubjectLabel = (
	subject: GovernmentCatalogSubject,
): string => subject.title_fa || subject.title;

export const getGovernmentCatalogTeamLabel = (
	team: GovernmentCatalogTeam,
): string =>
	team.display_name_fa || team.name_fa || team.display_name || team.name;

export const getGovernmentCatalogActionLabel = (
	action: GovernmentCatalogAction,
): string => action.name_fa || action.name || action.code;

export const getGovernmentCatalogStats = (
	catalog: GovernmentCatalogResponse,
): GovernmentCatalogStats => {
	const scenarios = catalog.subjects.flatMap((subject) =>
		subject.sub_subjects.flatMap((subSubject) => subSubject.scenarios),
	);
	return {
		goals: catalog.goals.length,
		subjects: catalog.subjects.length,
		teams: catalog.teams.length,
		actions: catalog.bannable_actions.length,
		scenarios: scenarios.length,
		steps: scenarios.reduce(
			(total, scenario) => total + scenario.steps.length,
			0,
		),
	};
};

export const getGovernmentCatalogNodes = (
	catalog: GovernmentCatalogResponse,
): GovernmentCatalogNodeOption[] => {
	const nodes: GovernmentCatalogNodeOption[] = [];
	for (const subject of catalog.subjects) {
		const subjectLabel = getGovernmentCatalogSubjectLabel(subject);
		nodes.push({
			id: subject.id,
			type: "subject",
			label: `موضوع · ${subjectLabel}`,
			searchText: `${subjectLabel} ${subject.title} ${subject.id}`,
		});
		for (const subSubject of subject.sub_subjects) {
			const subSubjectLabel = subSubject.title_fa || subSubject.title;
			nodes.push({
				id: subSubject.id,
				type: "sub_subject",
				label: `زیرموضوع · ${subSubjectLabel}`,
				searchText: `${subSubjectLabel} ${subSubject.title} ${subSubject.id}`,
			});
			for (const scenario of subSubject.scenarios) {
				const scenarioLabel = scenario.title_fa || scenario.title;
				nodes.push({
					id: scenario.id,
					type: "scenario",
					label: `سناریو · ${scenarioLabel}`,
					searchText: `${scenarioLabel} ${scenario.title} ${scenario.id}`,
				});
				for (const step of scenario.steps) {
					nodes.push({
						id: step.id,
						type: "step",
						label: `گام · ${step.order ?? "—"} · ${step.action_code}`,
						searchText: `${step.id} ${step.action_code} ${scenarioLabel}`,
						actionCode: step.action_code,
					});
				}
			}
		}
	}
	for (const action of catalog.bannable_actions) {
		const label = getGovernmentCatalogActionLabel(action);
		nodes.push({
			id: action.code,
			type: "action",
			label: `کنش · ${label}`,
			searchText: `${label} ${action.name} ${action.code}`,
			actionCode: action.code,
		});
	}
	return nodes.sort((first, second) => {
		if (first.type === "step" && second.type !== "step") return -1;
		if (first.type !== "step" && second.type === "step") return 1;
		return first.label.localeCompare(second.label, "fa");
	});
};

export const getGovernmentOrderTargetTeams = (
	catalog: GovernmentCatalogResponse,
): GovernmentCatalogTeam[] => {
	const playerTeams = catalog.teams.filter(
		(team) =>
			team.id !== catalog.government_team_id &&
			team.role?.type !== "GOVERNMENT",
	);
	return playerTeams.length > 0 ? playerTeams : catalog.teams;
};

export const matchesGovernmentCatalogSearch = (
	query: string,
	...values: Array<string | null | undefined>
): boolean => {
	const normalized = query.trim().toLocaleLowerCase("fa");
	if (!normalized) return true;
	return values.some((value) =>
		(value ?? "").toLocaleLowerCase("fa").includes(normalized),
	);
};

export const validateGovernmentOrderAgainstCatalog = (
	catalog: GovernmentCatalogResponse,
	order: GovernmentOrder,
): GovernmentCatalogValidationResult => {
	if (
		!getGovernmentOrderTargetTeams(catalog).some(
			(team) => team.id === order.target_team_id,
		)
	) {
		return { valid: false, message: "تیم هدف در کاتالوگ سمت شما وجود ندارد." };
	}
	if (
		order.order_type === "ASSIGN_SUBJECT" ||
		order.order_type === "FORCE_SUBJECT"
	) {
		return catalog.subjects.some(
			(subject) => subject.id === order.payload.subject_id,
		)
			? { valid: true, message: "" }
			: {
					valid: false,
					message: GOVERNMENT_CATALOG_LABELS_FA.subjectUnavailable,
				};
	}
	if (
		order.order_type === "BAN_ACTION" ||
		order.order_type === "UNBAN_ACTION"
	) {
		return catalog.bannable_actions.some(
			(action) => action.code === order.payload.action_code,
		)
			? { valid: true, message: "" }
			: {
					valid: false,
					message: GOVERNMENT_CATALOG_LABELS_FA.actionUnavailable,
				};
	}
	return { valid: true, message: "" };
};

export const getGovernmentCatalogPrefill = (
	type: "subject" | "action",
	id: string,
	currentOrderType: GovernmentOrderType,
): {
	orderType: GovernmentOrderType;
	subjectId?: string;
	actionCode?: string;
} => {
	if (type === "subject") {
		return {
			orderType:
				currentOrderType === "FORCE_SUBJECT"
					? "FORCE_SUBJECT"
					: "ASSIGN_SUBJECT",
			subjectId: id,
		};
	}
	return {
		orderType:
			currentOrderType === "UNBAN_ACTION" ? "UNBAN_ACTION" : "BAN_ACTION",
		actionCode: id,
	};
};
