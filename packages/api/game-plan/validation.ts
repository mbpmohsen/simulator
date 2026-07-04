import type {
	ConfigureAllRequestV2,
	GamePlanValidationError,
	ImpactEffect,
	TeamPlayerRequest,
} from "../game-server/types";

export const REQUIRED_VISIBILITY_EVENT_TYPES = [
	"PHASE_STARTED",
	"PHASE_ENDED",
	"PHASE_TIMEOUT",
	"VOTING_STARTED",
	"VOTE_CAST",
	"VOTE_TALLY_UPDATED",
	"VOTING_ENDED",
	"TEAM_MAJORITY_DECIDED",
	"TEAM_ACTION_SELECTED",
	"TEAM_TARGET_SELECTED",
	"TEAMMATE_ACTION_SELECTED",
	"VOTE_SUBMITTED",
	"ACTION_UNLOCKED",
	"ACTION_EXECUTED",
	"EFFECT_APPLIED",
	"GOVERNMENT_SELECTION_STARTED",
	"GOVERNMENT_SELECTION_ENDED",
	"GOVERNMENT_INTERVENTION",
	"GOVERNMENT_ALERT",
	"GOVERNMENT_ORDER_ISSUED",
	"SCENARIO_STEP_RESOLVED",
	"ATTACK_DECLARED",
	"ATTACK_RESOLVED",
	"DEFENSE_RESOLVED",
	"COMBAT_ROUND_COMPLETED",
	"DAMAGE_APPLIED",
	"TURN_STARTED",
	"TURN_ENDED",
	"TURN_RESULTS",
	"CALCULATION_STARTED",
	"CALCULATION_ENDED",
	"TEAM_ACTION_RESOLVED",
	"TURN_ANALYTICS_RECORDED",
	"POINTS_UPDATED",
	"CREDITS_UPDATED",
	"BLACK_MARKET_ITEM_PURCHASED",
	"BLACK_MARKET_ITEM_ACTIVATED",
	"BLACK_MARKET_ITEM_EXPIRED",
	"FACTOR_CREATED",
	"FACTOR_APPLIED",
	"FACTOR_EXPIRED",
	"DIRECTIVE_SET",
	"DIRECTIVE_STARTED",
	"DIRECTIVE_ENDED",
	"DIRECTIVE_EFFECT_APPLIED",
	"DIRECTIVES_APPLIED",
	"USER_ASSIGNED_TO_GAME",
	"USER_STREAM_CONNECTED",
	"USER_STREAM_DISCONNECTED",
	"USER_HEARTBEAT",
	"TEAM_READY",
	"TEAM_MEMBER_OFFLINE",
	"TEAM_STATE_CHANGED",
	"ALL_TEAMS_READY",
	"GAME_CONFIGURED",
	"GAME_STARTED",
	"GAME_PAUSED",
	"GAME_RESUMED",
	"GAME_ENDED",
	"GAME_RESET",
	"GAME_STATE_SNAPSHOT",
	"WINNER_DECLARED",
	"DRAW_DECLARED",
	"ERROR",
	"INVALID_ACTION_ATTEMPTED",
	"ACTION_REJECTED",
] as const;

export type ValidationGroup =
	| "goals"
	| "subjects"
	| "sub_subjects"
	| "scenarios"
	| "steps"
	| "actions"
	| "members"
	| "effects"
	| "visibility"
	| "general";

export interface ClientValidationIssue extends GamePlanValidationError {
	group: ValidationGroup;
}

export interface ClientValidationResult {
	valid: boolean;
	errors: ClientValidationIssue[];
}

const teamRoleType = (
	role: ConfigureAllRequestV2["teams"][number]["role"],
): string => (typeof role === "string" ? role : role.type);

export const validateTeamMemberAssignments = (
	plan: ConfigureAllRequestV2,
	registeredUserIds: Iterable<number>,
): ClientValidationIssue[] => {
	const issues: ClientValidationIssue[] = [];
	const registered = new Set(registeredUserIds);
	const assignedTo = new Map<number, number>();
	const add = (loc: string, code: string, message: string): void => {
		issues.push({ group: "members", loc, code, message });
	};

	for (const [teamIndex, team] of plan.teams.entries()) {
		const teamId = team.id ?? teamIndex;
		const loc = `teams[${teamIndex}].players`;
		if (team.players.length === 0) {
			add(
				loc,
				"TEAM_HAS_NO_MEMBERS",
				`برای تیم «${team.name}» عضوی انتخاب نشده است.`,
			);
		}
		if (teamRoleType(team.role) === "GOVERNMENT" && team.players.length !== 1) {
			add(
				loc,
				"GOVERNMENT_REQUIRES_ONE_MEMBER",
				`تیم دولتی «${team.name}» باید دقیقاً یک عضو داشته باشد.`,
			);
		}

		for (const [playerIndex, player] of team.players.entries()) {
			const playerLoc = `${loc}[${playerIndex}].userId`;
			if (!registered.has(player.userId)) {
				add(
					playerLoc,
					"USER_NOT_REGISTERED",
					`کاربر ${player.userId} در فهرست کاربران ثبت‌شده سرور وجود ندارد.`,
				);
			}
			const previousTeamId = assignedTo.get(player.userId);
			if (previousTeamId !== undefined && previousTeamId !== teamId) {
				add(
					playerLoc,
					"USER_ASSIGNED_TO_MULTIPLE_TEAMS",
					`کاربر ${player.userId} هم‌زمان به بیش از یک تیم اختصاص یافته است.`,
				);
			} else {
				assignedTo.set(player.userId, teamId);
			}
		}
	}

	for (const [governmentIndex, government] of (
		plan.government?.side_governments ?? []
	).entries()) {
		const team = plan.teams.find(
			(candidate) => candidate.id === government.team_id,
		);
		const operator = team?.players[0];
		if (!team || teamRoleType(team.role) !== "GOVERNMENT") {
			add(
				`government.side_governments[${governmentIndex}].team_id`,
				"GOVERNMENT_TEAM_NOT_FOUND",
				"تیم دولتی متناظر با این سمت پیدا نشد.",
			);
			continue;
		}
		if (operator && government.player.userId !== operator.userId) {
			add(
				`government.side_governments[${governmentIndex}].player.userId`,
				"GOVERNMENT_OPERATOR_MISMATCH",
				`عضو دولت «${team.name}» با کاربر پیکربندی دولت یکسان نیست.`,
			);
		}
	}

	return issues;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const cloneValue = <T>(value: T): T => {
	if (typeof structuredClone === "function") return structuredClone(value);
	return JSON.parse(JSON.stringify(value)) as T;
};

const normalizePlayer = (value: unknown): TeamPlayerRequest => {
	const player = asRecord(value) ?? {};
	const userId = typeof player.userId === "number" ? player.userId : 0;
	const isLeader =
		typeof player.isLeader === "boolean"
			? player.isLeader
			: typeof player.is_leader === "boolean"
				? player.is_leader
				: undefined;
	const { is_leader: _legacyLeader, ...playerWithoutLegacyLeader } = player;
	return {
		...playerWithoutLegacyLeader,
		userId,
		...(isLeader === undefined ? {} : { isLeader }),
		...(typeof player.voteWeight === "number"
			? { voteWeight: player.voteWeight }
			: {}),
	};
};

export const normalizeDefaultGamePlan = (
	input: unknown,
): ConfigureAllRequestV2 => {
	const root = asRecord(cloneValue(input));
	if (!root || root.version !== "2.0") {
		throw new Error("فایل پیش‌فرض باید یک پیکربندی نسخه ۲.۰ باشد.");
	}
	for (const key of [
		"teams",
		"actions",
		"goals",
		"subjects",
		"sub_subjects",
		"scenarios",
		"scenario_steps",
		"impact_rules",
	]) {
		if (!Array.isArray(root[key]))
			throw new Error(`فیلد ${key} در فایل پیش‌فرض معتبر نیست.`);
	}
	const teams = (root.teams as unknown[]).map((teamValue) => {
		const team = asRecord(teamValue) ?? {};
		const players = Array.isArray(team.players)
			? team.players.map(normalizePlayer)
			: [];
		return { ...team, players };
	});
	return { ...root, teams } as unknown as ConfigureAllRequestV2;
};

const duplicateIds = (items: Array<{ id: string }>): Set<string> => {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const item of items) {
		if (seen.has(item.id)) duplicates.add(item.id);
		seen.add(item.id);
	}
	return duplicates;
};

export const validateDefaultGamePlanClientSide = (
	plan: ConfigureAllRequestV2,
): ClientValidationResult => {
	const errors: ClientValidationIssue[] = [];
	const add = (
		group: ValidationGroup,
		loc: string,
		code: string,
		message: string,
	): void => {
		errors.push({ group, loc, code, message });
	};
	const collections: Array<[ValidationGroup, string, Array<{ id: string }>]> = [
		["goals", "GOAL", plan.goals],
		["subjects", "SUBJECT", plan.subjects],
		["sub_subjects", "SUB_SUBJECT", plan.sub_subjects],
		["scenarios", "SCENARIO", plan.scenarios],
		["steps", "STEP", plan.scenario_steps],
		["effects", "IMPACT_RULE", plan.impact_rules],
	];
	for (const [group, label, items] of collections) {
		for (const id of duplicateIds(items))
			add(group, id, `DUPLICATE_${label}_ID`, `شناسه «${id}» تکراری است.`);
	}
	const sideIds = new Set(plan.teams.map((team) => team.side_id));
	const teamIds = new Set(
		plan.teams.flatMap((team) => (team.id === undefined ? [] : [team.id])),
	);
	const goalIds = new Set(plan.goals.map((goal) => goal.id));
	const subjectIds = new Set(plan.subjects.map((subject) => subject.id));
	const subSubjectIds = new Set(plan.sub_subjects.map((item) => item.id));
	const scenarioIds = new Set(plan.scenarios.map((scenario) => scenario.id));
	const actionCodes = new Set(plan.actions.map((action) => action.code));
	const stepIds = new Set(plan.scenario_steps.map((step) => step.id));
	const effectTargets = new Set([
		...subjectIds,
		...subSubjectIds,
		...scenarioIds,
		...stepIds,
		...actionCodes,
	]);

	for (const goal of plan.goals) {
		if (!sideIds.has(goal.side_id))
			add("goals", goal.id, "MISSING_SIDE", "سمت هدف در تیم‌ها تعریف نشده است.");
	}
	for (const subject of plan.subjects) {
		if (!goalIds.has(subject.goal_id))
			add("subjects", subject.id, "MISSING_GOAL", "هدف والد پیدا نشد.");
		if (!sideIds.has(subject.owner_side_id))
			add("subjects", subject.id, "MISSING_SIDE", "سمت مالک پیدا نشد.");
		if (!teamIds.has(subject.target_team_id))
			add("subjects", subject.id, "MISSING_TARGET_TEAM", "تیم هدف پیدا نشد.");
		const children = plan.sub_subjects.filter(
			(item) => item.subject_id === subject.id,
		);
		if (children.length === 0)
			add(
				"subjects",
				subject.id,
				"SUBJECT_NOT_DECOMPOSED",
				"موضوع هیچ زیرموضوعی ندارد.",
			);
		const share = children.reduce(
			(sum, child) => sum + child.progress_share,
			0,
		);
		if (share !== 100)
			add(
				"sub_subjects",
				subject.id,
				"SHARES_NOT_100",
				`جمع سهم زیرموضوع‌ها ${share}٪ است؛ باید ۱۰۰٪ باشد.`,
			);
	}
	for (const subSubject of plan.sub_subjects) {
		if (!subjectIds.has(subSubject.subject_id))
			add(
				"sub_subjects",
				subSubject.id,
				"MISSING_SUBJECT",
				"موضوع والد پیدا نشد.",
			);
		if (
			!plan.scenarios.some(
				(scenario) => scenario.sub_subject_id === subSubject.id,
			)
		)
			add(
				"scenarios",
				subSubject.id,
				"SUB_SUBJECT_HAS_NO_SCENARIO",
				"این زیرموضوع سناریو ندارد.",
			);
	}
	for (const scenario of plan.scenarios) {
		if (!subSubjectIds.has(scenario.sub_subject_id))
			add(
				"scenarios",
				scenario.id,
				"MISSING_SUB_SUBJECT",
				"زیرموضوع والد پیدا نشد.",
			);
		const scenarioSteps = plan.scenario_steps.filter(
			(step) => step.scenario_id === scenario.id,
		);
		if (scenarioSteps.length === 0)
			add(
				"steps",
				scenario.id,
				"SCENARIO_HAS_NO_STEP",
				"این سناریو گام ندارد.",
			);
		if (scenario.execution_mode === "ordered") {
			for (const step of scenarioSteps) {
				if (step.order === null || step.order === undefined)
					add(
						"steps",
						step.id,
						"ORDER_REQUIRED",
						"گام سناریوی ترتیبی باید ترتیب داشته باشد.",
					);
			}
		}
	}
	for (const step of plan.scenario_steps) {
		if (!scenarioIds.has(step.scenario_id))
			add("steps", step.id, "MISSING_SCENARIO", "سناریوی والد پیدا نشد.");
		if (!actionCodes.has(step.action_code))
			add(
				"actions",
				step.id,
				"MISSING_ACTION",
				`کنش «${step.action_code}» پیدا نشد.`,
			);
		const siblings = new Set(
			plan.scenario_steps
				.filter((item) => item.scenario_id === step.scenario_id)
				.map((item) => item.id),
		);
		for (const dependency of step.depends_on ?? []) {
			if (dependency === step.id)
				add(
					"steps",
					step.id,
					"SELF_DEPENDENCY",
					"گام نمی‌تواند به خودش وابسته باشد.",
				);
			else if (!siblings.has(dependency))
				add(
					"steps",
					step.id,
					"INVALID_DEPENDENCY",
					`پیش‌نیاز «${dependency}» در همین سناریو نیست.`,
				);
		}
		const inspectEffects = (effects: ImpactEffect[] | undefined): void => {
			for (const effect of effects ?? []) {
				if (effect.target && !effectTargets.has(effect.target))
					add(
						"effects",
						step.id,
						"DANGLING_EFFECT_TARGET",
						`هدف اثر «${effect.target}» پیدا نشد.`,
					);
			}
		};
		inspectEffects(step.on_success);
		inspectEffects(step.on_failure);
	}
	for (const rule of plan.impact_rules) {
		for (const effect of rule.effects) {
			if (effect.target && !effectTargets.has(effect.target))
				add(
					"effects",
					rule.id,
					"DANGLING_EFFECT_TARGET",
					`هدف اثر «${effect.target}» پیدا نشد.`,
				);
		}
	}
	for (const eventType of REQUIRED_VISIBILITY_EVENT_TYPES) {
		if (!plan.visibility_config?.events?.[eventType])
			add(
				"visibility",
				eventType,
				"EVENT_VISIBILITY_MISSING",
				`سطح نمایش رویداد ${eventType} تعریف نشده است.`,
			);
	}
	if (!plan.visibility_config?.cross_side_result)
		add(
			"visibility",
			"cross_side_result",
			"MISSING_VISIBILITY_CONFIG",
			"تنظیم نمایش بین‌سمتی تعریف نشده است.",
		);
	return { valid: errors.length === 0, errors };
};

export const validateSubjectShares = (
	plan: ConfigureAllRequestV2,
	subjectId: string,
): boolean =>
	plan.sub_subjects
		.filter((item) => item.subject_id === subjectId)
		.reduce((sum, item) => sum + item.progress_share, 0) === 100;
