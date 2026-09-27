import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ConfigureAllRequestV2 } from "../game-server/types";
import {
	createPlanSide,
	createPlanTeam,
	isGovernmentTeam,
	planRoster,
	previewRosterRemoval,
	removeRosterNode,
	roleTypeOf,
	setActionTeams,
	setTeamCredits,
	setTeamRole,
} from "./roster";
import { validateTeamStructure } from "./validation";

/**
 * Sides, teams and governments. The rule underneath all of it: a side holds
 * exactly one government and any number of player teams, and credits are per
 * team rather than pooled across the side.
 */

const demo = (): ConfigureAllRequestV2 =>
	JSON.parse(
		readFileSync(
			resolve(__dirname, "../../../apps/admin/public/data/demo-game-plan.json"),
			"utf8",
		),
	) as ConfigureAllRequestV2;

const codes = (plan: ConfigureAllRequestV2): string[] =>
	validateTeamStructure(plan).map((issue) => issue.code);

const RED = 1100000001;
const BLUE = 2200000001;

describe("roster", () => {
	it("reads the demo as two sides, each with a government over one team", () => {
		const roster = planRoster(demo());
		expect(roster).toHaveLength(2);
		for (const side of roster) {
			expect(side.government).not.toBeNull();
			expect(side.teams).toHaveLength(1);
			expect(side.playerCredits).toBe(80);
		}
		expect(codes(demo())).toEqual([]);
	});

	it("puts a second team under the same government", () => {
		const { plan } = createPlanTeam(demo(), RED);
		const red = planRoster(plan).find((side) => side.sideId === RED);
		expect(red?.teams).toHaveLength(2);
		// Same government, no second one.
		expect(
			plan.teams.filter(
				(team) => team.side_id === RED && isGovernmentTeam(team),
			),
		).toHaveLength(1);
	});

	it("warns that a new team doubles the side's credits rather than splitting them", () => {
		const { plan } = createPlanTeam(demo(), RED);
		const red = planRoster(plan).find((side) => side.sideId === RED);
		expect(red?.playerCredits).toBe(160);
		expect(codes(plan)).toContain("SIDE_CREDITS_UNBALANCED");
	});

	it("says a brand-new team cannot play until it is given actions", () => {
		const { plan, teamId } = createPlanTeam(demo(), RED);
		expect(codes(plan)).toContain("TEAM_HAS_NO_ACTIONS");
		const withAction = setActionTeams(plan, "ATK_PROBE_ACCESS", [
			teamId as number,
		]);
		expect(codes(withAction)).not.toContain("TEAM_HAS_NO_ACTIONS");
	});

	it("creates a new side already carrying a government", () => {
		const { plan, sideId } = createPlanSide(demo());
		const side = planRoster(plan).find((entry) => entry.sideId === sideId);
		expect(side?.government).not.toBeNull();
		expect(side?.teams).toHaveLength(1);
		expect(codes(plan)).not.toContain("SIDE_HAS_NO_GOVERNMENT");
	});

	it("hands the government job over instead of leaving a side with two", () => {
		const plan = setTeamRole(demo(), 1100000102, "GOVERNMENT");
		const red = planRoster(plan).find((side) => side.sideId === RED);
		expect(red?.government?.id).toBe(1100000102);
		expect(red?.teams.map((team) => team.id)).toEqual([1100000101]);
		expect(roleTypeOf(red?.teams[0] as never)).not.toBe("GOVERNMENT");
		// The government config follows the job, not the team.
		expect(red?.governmentConfig?.team_id).toBe(1100000102);
		expect(codes(plan)).not.toContain("SIDE_HAS_MULTIPLE_GOVERNMENTS");
	});

	it("reports a side left with no government", () => {
		const plan = setTeamRole(demo(), 1100000101, "ATTACKER");
		expect(codes(plan)).toContain("SIDE_HAS_NO_GOVERNMENT");
		expect(
			plan.government?.side_governments.some(
				(entry) => entry.team_id === 1100000101,
			),
		).toBe(false);
	});

	it("says what removing a side takes with it, before removing it", () => {
		const preview = previewRosterRemoval(demo(), { kind: "side", id: BLUE });
		expect(preview.teams).toHaveLength(2);
		expect(preview.removesGovernment).toBe(true);
		expect(preview.goals.length).toBeGreaterThan(0);
		// Subjects aimed at the departing teams cannot be played any more.
		expect(preview.orphanedSubjects.length).toBeGreaterThan(0);
		// And the defences nobody else is allowed to play.
		expect(preview.orphanedActions).toContain("DEF_HARDEN_IDENTITY");
	});

	it("removes a side without leaving a dangling reference", () => {
		const plan = removeRosterNode(demo(), { kind: "side", id: BLUE });
		const teamIds = new Set(plan.teams.map((team) => team.id));
		expect([...teamIds]).toEqual([1100000101, 1100000102]);
		expect(
			plan.subjects.every((subject) => teamIds.has(subject.target_team_id)),
		).toBe(true);
		expect(plan.goals.every((goal) => goal.side_id === RED)).toBe(true);
		// Nothing orphaned below the goals either.
		const subjectIds = new Set(plan.subjects.map((item) => item.id));
		expect(
			plan.sub_subjects.every((item) => subjectIds.has(item.subject_id)),
		).toBe(true);
		const scenarioIds = new Set(plan.scenarios.map((item) => item.id));
		expect(
			plan.scenario_steps.every((step) => scenarioIds.has(step.scenario_id)),
		).toBe(true);
		expect(
			plan.government?.side_governments.every((entry) => entry.side_id === RED),
		).toBe(true);
	});

	it("keeps credits per team", () => {
		const plan = setTeamCredits(demo(), 1100000102, 300);
		const red = planRoster(plan).find((side) => side.sideId === RED);
		expect(red?.teams[0]?.starting_credits).toBe(300);
		// The other side is untouched - nothing is pooled or rebalanced.
		const blue = planRoster(plan).find((side) => side.sideId === BLUE);
		expect(blue?.playerCredits).toBe(80);
	});
});
