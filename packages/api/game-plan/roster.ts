import type {
	ConfigureAllRequestV2,
	SideGovernmentRequest,
	TeamRequest,
	TeamRoleType,
} from "../game-server/types";

/**
 * The game's org chart: sides, the teams on them, and the government that runs
 * each side.
 *
 * Until now this layer was whatever the loaded JSON said — the builder could
 * assign players to teams but could not create a team, add a side, or say which
 * team is the government. A facilitator who wanted two attacker teams under one
 * government had to hand-edit JSON.
 *
 * The shape the server wants:
 *
 *     side ─┬─ one GOVERNMENT team  ──→ government.side_governments[]
 *           └─ one or more player teams (ATTACKER / DEFENCER / BOTH)
 *
 * A government runs every player team that shares its `side_id`. That link is
 * never written down: it is inferred from the side, which is why moving a team
 * between sides silently changes who governs it.
 *
 * **Credits do not pool.** Each team carries its own `starting_credits`, so
 * adding a second team to a side adds that side's whole spending power again
 * rather than splitting it. Anything here that creates a team says so, and the
 * validator warns when one side ends up with far more than another.
 *
 * Every function is pure: it takes a plan and returns a new one.
 */

export const TEAM_ROLES: readonly TeamRoleType[] = [
	"ATTACKER",
	"DEFENCER",
	"BOTH",
	"GOVERNMENT",
];

export const TEAM_ROLE_LABEL_FA: Record<string, string> = {
	ATTACKER: "مهاجم",
	DEFENCER: "مدافع",
	BOTH: "مهاجم و مدافع",
	GOVERNMENT: "دولت",
};

const ROLE_ACTION_TYPES: Record<string, string[]> = {
	ATTACKER: ["attack"],
	DEFENCER: ["defense"],
	BOTH: ["attack", "defense"],
	GOVERNMENT: ["government"],
};

export const roleTypeOf = (team: TeamRequest): string =>
	typeof team.role === "string" ? team.role : team.role.type;

export const isGovernmentTeam = (team: TeamRequest): boolean =>
	roleTypeOf(team) === "GOVERNMENT" || team.team_type === "GOVERNMENT";

/** Every side id the plan mentions, in the order the teams introduce them. */
export const planSideIds = (plan: ConfigureAllRequestV2): number[] => {
	const seen: number[] = [];
	for (const team of plan.teams) {
		if (team.side_id === undefined) continue;
		if (!seen.includes(team.side_id)) seen.push(team.side_id);
	}
	return seen;
};

/** The display name of a side, taken from the first team that names it. */
export const planSideName = (
	plan: ConfigureAllRequestV2,
	sideId: number,
): string => {
	for (const team of plan.teams) {
		if (team.side_id !== sideId) continue;
		const name = team.side_name_fa?.trim() || team.side_name?.trim();
		if (name) return name;
	}
	return `سمت ${sideId.toLocaleString("fa-IR")}`;
};

export interface SideRoster {
	sideId: number;
	name: string;
	/** The GOVERNMENT team on this side, when one exists. */
	government: TeamRequest | null;
	/** Its entry in `government.side_governments`, when configured. */
	governmentConfig: SideGovernmentRequest | null;
	/** Every non-government team on this side — the teams that government runs. */
	teams: TeamRequest[];
	/** Sum of the side's player teams' starting credits. Never pooled. */
	playerCredits: number;
}

/** The org chart, as the builder shows it. */
export const planRoster = (plan: ConfigureAllRequestV2): SideRoster[] =>
	planSideIds(plan).map((sideId) => {
		const onSide = plan.teams.filter((team) => team.side_id === sideId);
		const government = onSide.find(isGovernmentTeam) ?? null;
		const teams = onSide.filter((team) => !isGovernmentTeam(team));
		return {
			sideId,
			name: planSideName(plan, sideId),
			government,
			governmentConfig:
				plan.government?.side_governments.find(
					(entry) => entry.side_id === sideId,
				) ?? null,
			teams,
			playerCredits: teams.reduce(
				(sum, team) => sum + (team.starting_credits ?? 0),
				0,
			),
		};
	});

const takenTeamIds = (plan: ConfigureAllRequestV2): Set<number> =>
	new Set(
		plan.teams.flatMap((team) => (team.id === undefined ? [] : [team.id])),
	);

/**
 * Ids follow the server's own convention — a side id like 1100000001 with its
 * teams at 1100000101, 1100000102 — so a plan built here reads like the ones
 * the backend produces. The suffix keeps counting when the pattern runs out.
 */
const nextTeamId = (sideId: number, taken: Set<number>): number => {
	const base = sideId + 100;
	for (let offset = 1; offset < 90; offset += 1) {
		const candidate = base + offset;
		if (!taken.has(candidate)) return candidate;
	}
	let fallback = sideId + 1;
	while (taken.has(fallback)) fallback += 1;
	return fallback;
};

const nextSideId = (plan: ConfigureAllRequestV2): number => {
	const used = new Set(planSideIds(plan));
	// 1100000001, 2200000001, 3300000001 … the pattern the demo plans use.
	for (let index = 1; index <= 9; index += 1) {
		const candidate = index * 1100000000 + 1;
		if (!used.has(candidate)) return candidate;
	}
	let fallback = 1;
	while (used.has(fallback)) fallback += 1;
	return fallback;
};

const makeRole = (type: string) => ({
	type,
	allowed_action_types: ROLE_ACTION_TYPES[type] ?? [],
	type_fa: TEAM_ROLE_LABEL_FA[type] ?? type,
});

export interface RosterChange {
	plan: ConfigureAllRequestV2;
	/** The team or side the caller should focus after the change. */
	teamId?: number;
	sideId?: number;
}

/**
 * A new side, with a government team and one player team — the smallest side
 * that is actually playable. Creating the government straight away is the point:
 * a side without one is an error every validator will report, and there is no
 * reason to make the admin walk through that state.
 */
export const createPlanSide = (
	plan: ConfigureAllRequestV2,
	role: string = "ATTACKER",
): RosterChange => {
	const sideId = nextSideId(plan);
	const taken = takenTeamIds(plan);
	const governmentId = sideId + 101;
	taken.add(governmentId);
	const teamId = nextTeamId(sideId, taken);
	const index = planSideIds(plan).length + 1;
	const sideName = `سمت ${index.toLocaleString("fa-IR")}`;
	// Match the credits of an existing side so a new side does not silently
	// start richer or poorer than the ones already in the plan.
	const reference = planRoster(plan)[0];
	const playerCredits = reference?.teams[0]?.starting_credits ?? 80;
	const governmentCredits = reference?.government?.starting_credits ?? 120;

	const government: TeamRequest = {
		id: governmentId,
		name: `${sideName} — دولت`,
		name_fa: `${sideName} — دولت`,
		side_id: sideId,
		side_name: sideName,
		side_name_fa: sideName,
		team_type: "GOVERNMENT",
		role: makeRole("GOVERNMENT"),
		starting_credits: governmentCredits,
		players: [],
	};
	const team: TeamRequest = {
		id: teamId,
		name: `${sideName} — تیم ۱`,
		name_fa: `${sideName} — تیم ۱`,
		side_id: sideId,
		side_name: sideName,
		side_name_fa: sideName,
		team_type: "PLAYER",
		role: makeRole(role),
		starting_credits: playerCredits,
		players: [],
	};

	return {
		plan: withGovernmentEntry(
			{ ...plan, teams: [...plan.teams, government, team] },
			sideId,
			governmentId,
		),
		sideId,
		teamId,
	};
};

/** A new player team on an existing side. It gets its own credits, not a share. */
export const createPlanTeam = (
	plan: ConfigureAllRequestV2,
	sideId: number,
	role: string = "ATTACKER",
): RosterChange => {
	const taken = takenTeamIds(plan);
	const teamId = nextTeamId(sideId, taken);
	const roster = planRoster(plan).find((entry) => entry.sideId === sideId);
	const sideName = roster?.name ?? planSideName(plan, sideId);
	const credits = roster?.teams[0]?.starting_credits ?? 80;
	const ordinal = (roster?.teams.length ?? 0) + 1;
	const team: TeamRequest = {
		id: teamId,
		name: `${sideName} — تیم ${ordinal.toLocaleString("fa-IR")}`,
		name_fa: `${sideName} — تیم ${ordinal.toLocaleString("fa-IR")}`,
		side_id: sideId,
		side_name: sideName,
		side_name_fa: sideName,
		team_type: "PLAYER",
		role: makeRole(role),
		starting_credits: credits,
		players: [],
	};
	return { plan: { ...plan, teams: [...plan.teams, team] }, sideId, teamId };
};

/** What removing a team or a side would take with it. Nothing is changed. */
export interface RosterRemoval {
	teams: number[];
	/** Goals that belong to a side being removed, with everything under them. */
	goals: string[];
	/** Subjects whose target team disappears. */
	orphanedSubjects: string[];
	/** Actions that would be left with no team allowed to play them. */
	orphanedActions: string[];
	/** True when the team being removed is a side's government. */
	removesGovernment: boolean;
}

export const previewRosterRemoval = (
	plan: ConfigureAllRequestV2,
	target: { kind: "team"; id: number } | { kind: "side"; id: number },
): RosterRemoval => {
	const teams =
		target.kind === "team"
			? plan.teams.filter((team) => team.id === target.id)
			: plan.teams.filter((team) => team.side_id === target.id);
	const teamIds = teams.flatMap((team) =>
		team.id === undefined ? [] : [team.id],
	);
	const goals =
		target.kind === "side"
			? plan.goals
					.filter((goal) => goal.side_id === target.id)
					.map((goal) => goal.id)
			: [];
	const orphanedSubjects = plan.subjects
		.filter((subject) => teamIds.includes(subject.target_team_id))
		.map((subject) => subject.id);
	const orphanedActions = plan.actions
		.filter((action) => {
			const allowed = action.requirements?.allowed_team_ids ?? [];
			return allowed.length > 0 && allowed.every((id) => teamIds.includes(id));
		})
		.map((action) => action.code);
	return {
		teams: teamIds,
		goals,
		orphanedSubjects,
		orphanedActions,
		removesGovernment: teams.some(isGovernmentTeam),
	};
};

const dropTeamReferences = (
	plan: ConfigureAllRequestV2,
	teamIds: number[],
): ConfigureAllRequestV2 => ({
	...plan,
	teams: plan.teams.filter(
		(team) => team.id === undefined || !teamIds.includes(team.id),
	),
	actions: plan.actions.map((action) => {
		const allowed = action.requirements?.allowed_team_ids;
		if (!allowed) return action;
		return {
			...action,
			requirements: {
				...action.requirements,
				allowed_team_ids: allowed.filter((id) => !teamIds.includes(id)),
			},
		};
	}),
	government: plan.government
		? {
				...plan.government,
				side_governments: plan.government.side_governments.filter(
					(entry) => !teamIds.includes(entry.team_id),
				),
			}
		: plan.government,
});

/**
 * Removes a team or a whole side, and every reference that would dangle.
 *
 * A subject whose target team is gone is removed with its sub-subjects,
 * scenarios and steps, because a subject with no target cannot be played — the
 * same cascade the goal tree uses.
 */
export const removeRosterNode = (
	plan: ConfigureAllRequestV2,
	target: { kind: "team"; id: number } | { kind: "side"; id: number },
): ConfigureAllRequestV2 => {
	const removal = previewRosterRemoval(plan, target);
	let next = dropTeamReferences(plan, removal.teams);

	const goneGoals = new Set(removal.goals);
	const goneSubjects = new Set([
		...removal.orphanedSubjects,
		...next.subjects
			.filter((subject) => goneGoals.has(subject.goal_id))
			.map((subject) => subject.id),
	]);
	const goneSubSubjects = new Set(
		next.sub_subjects
			.filter((item) => goneSubjects.has(item.subject_id))
			.map((item) => item.id),
	);
	const goneScenarios = new Set(
		next.scenarios
			.filter((item) => goneSubSubjects.has(item.sub_subject_id))
			.map((item) => item.id),
	);

	next = {
		...next,
		goals: next.goals.filter((goal) => !goneGoals.has(goal.id)),
		subjects: next.subjects.filter((subject) => !goneSubjects.has(subject.id)),
		sub_subjects: next.sub_subjects.filter(
			(item) => !goneSubSubjects.has(item.id),
		),
		scenarios: next.scenarios.filter((item) => !goneScenarios.has(item.id)),
		scenario_steps: next.scenario_steps.filter(
			(step) => !goneScenarios.has(step.scenario_id),
		),
	};

	return next;
};

/** Renames a team, keeping the Persian and Latin names in step. */
export const renamePlanTeam = (
	plan: ConfigureAllRequestV2,
	teamId: number,
	name: string,
): ConfigureAllRequestV2 => ({
	...plan,
	teams: plan.teams.map((team) =>
		team.id === teamId ? { ...team, name, name_fa: name } : team,
	),
});

/** Renames a side on every team that carries its name. */
export const renamePlanSide = (
	plan: ConfigureAllRequestV2,
	sideId: number,
	name: string,
): ConfigureAllRequestV2 => ({
	...plan,
	teams: plan.teams.map((team) =>
		team.side_id === sideId
			? { ...team, side_name: name, side_name_fa: name }
			: team,
	),
});

/** Sets a team's own starting credits. Credits are per team and never pooled. */
export const setTeamCredits = (
	plan: ConfigureAllRequestV2,
	teamId: number,
	credits: number,
): ConfigureAllRequestV2 => ({
	...plan,
	teams: plan.teams.map((team) =>
		team.id === teamId
			? { ...team, starting_credits: Math.max(0, Math.round(credits)) }
			: team,
	),
});

const withGovernmentEntry = (
	plan: ConfigureAllRequestV2,
	sideId: number,
	teamId: number,
): ConfigureAllRequestV2 => {
	const existing = plan.government?.side_governments ?? [];
	const template = existing[0];
	const entry: SideGovernmentRequest = {
		side_id: sideId,
		team_id: teamId,
		// The operator is filled in from the team's member on the members tab;
		// an entry with no player yet is incomplete, not wrong.
		player: existing.find((item) => item.team_id === teamId)?.player ?? {
			userId: 0,
		},
		permissions: template?.permissions ?? {
			can_ban_actions: true,
			can_modify_credits: true,
			can_impose_penalties: true,
			can_unban_actions: true,
		},
		intervention_config: template?.intervention_config ?? {
			interventions_per_game: 2,
			intervention_cooldown_turns: 1,
		},
	};
	const rest = existing.filter((item) => item.side_id !== sideId);
	return {
		...plan,
		government: {
			enabled: plan.government?.enabled ?? true,
			actions: plan.government?.actions,
			...plan.government,
			side_governments: [...rest, entry].sort(
				(left, right) => left.side_id - right.side_id,
			),
		},
	};
};

/**
 * Changes a team's role.
 *
 * Making a team the government is the interesting case: a side has exactly one
 * government, so the team that held the role gives it up and becomes a player
 * team rather than leaving the side with two.
 */
export const setTeamRole = (
	plan: ConfigureAllRequestV2,
	teamId: number,
	role: string,
): ConfigureAllRequestV2 => {
	const team = plan.teams.find((item) => item.id === teamId);
	if (!team || team.side_id === undefined) return plan;
	const sideId = team.side_id;
	const becomingGovernment = role === "GOVERNMENT";

	let next: ConfigureAllRequestV2 = {
		...plan,
		teams: plan.teams.map((item) => {
			if (item.id === teamId) {
				return {
					...item,
					role: makeRole(role),
					team_type: becomingGovernment ? "GOVERNMENT" : "PLAYER",
				};
			}
			// The outgoing government keeps its side and credits; only its job
			// changes.
			if (
				becomingGovernment &&
				item.side_id === sideId &&
				isGovernmentTeam(item)
			) {
				return {
					...item,
					role: makeRole("ATTACKER"),
					team_type: "PLAYER",
				};
			}
			return item;
		}),
	};

	if (becomingGovernment) {
		next = withGovernmentEntry(next, sideId, teamId);
	} else if (isGovernmentTeam(team)) {
		// The side has no government any more. The entry has to go with it, or
		// it points at a team that is now a player.
		next = {
			...next,
			government: next.government
				? {
						...next.government,
						side_governments: next.government.side_governments.filter(
							(entry) => entry.team_id !== teamId,
						),
					}
				: next.government,
		};
	}
	return next;
};

/** Turns one of a government's permissions on or off. */
export const setGovernmentPermission = (
	plan: ConfigureAllRequestV2,
	sideId: number,
	key: string,
	value: boolean,
): ConfigureAllRequestV2 => {
	if (!plan.government) return plan;
	return {
		...plan,
		government: {
			...plan.government,
			side_governments: plan.government.side_governments.map((entry) =>
				entry.side_id === sideId
					? {
							...entry,
							permissions: { ...(entry.permissions ?? {}), [key]: value },
						}
					: entry,
			),
		},
	};
};

/** Sets one number in a government's intervention budget. */
export const setGovernmentInterventionConfig = (
	plan: ConfigureAllRequestV2,
	sideId: number,
	key: string,
	value: number,
): ConfigureAllRequestV2 => {
	if (!plan.government) return plan;
	return {
		...plan,
		government: {
			...plan.government,
			side_governments: plan.government.side_governments.map((entry) =>
				entry.side_id === sideId
					? {
							...entry,
							intervention_config: {
								...(entry.intervention_config ?? {}),
								[key]: Math.max(0, Math.round(value)),
							},
						}
					: entry,
			),
		},
	};
};

/** Which teams a given action may be played by. */
export const setActionTeams = (
	plan: ConfigureAllRequestV2,
	actionCode: string,
	teamIds: number[],
): ConfigureAllRequestV2 => ({
	...plan,
	actions: plan.actions.map((action) =>
		action.code === actionCode
			? {
					...action,
					requirements: {
						...action.requirements,
						allowed_team_ids: [...teamIds].sort((a, b) => a - b),
					},
				}
			: action,
	),
});

export const GOVERNMENT_PERMISSION_LABEL_FA: Record<string, string> = {
	can_ban_actions: "ممنوع‌کردن کنش",
	can_unban_actions: "برداشتن ممنوعیت",
	can_modify_credits: "تغییر اعتبار تیم‌ها",
	can_impose_penalties: "اعمال جریمه",
};
