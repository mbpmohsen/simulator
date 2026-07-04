import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ConfigureAllRequestV2 } from "../game-server/types";
import { parseApiError } from "./api-error";
import { canSendCommunication } from "./communication";
import { buildGamePlanGraph } from "./graph";
import { formatLockReasonFa, getLocalized } from "./localization";
import {
	canSelectScenario,
	canVoteStep,
	validateGovernmentOrderPayload,
} from "./runtime";
import {
	normalizeDefaultGamePlan,
	REQUIRED_VISIBILITY_EVENT_TYPES,
	validateDefaultGamePlanClientSide,
	validateSubjectShares,
	validateTeamMemberAssignments,
} from "./validation";

const createPlan = (): ConfigureAllRequestV2 => ({
	version: "2.0",
	game_config: { num_turns: 3, point_threshold: 2 },
	teams: [
		{
			id: 1000000001,
			name: "Gov A",
			side_id: 1000000001,
			role: { type: "GOVERNMENT" },
			players: [{ userId: 1000000001 }],
		},
		{
			id: 1000000002,
			name: "Team A",
			side_id: 1000000001,
			role: { type: "ATTACKER" },
			players: [{ userId: 1000000002 }],
		},
		{
			id: 2000000001,
			name: "Gov B",
			side_id: 2000000001,
			role: { type: "GOVERNMENT" },
			players: [{ userId: 2000000001 }],
		},
		{
			id: 2000000002,
			name: "Team B",
			side_id: 2000000001,
			role: { type: "DEFENCER" },
			players: [{ userId: 2000000002 }],
		},
	],
	actions: [
		{
			code: "ACT",
			name: "Action",
			type: "attack",
			base_stats: { cost: 1, success_probability: 50 },
		},
	],
	goals: [{ id: "GOAL", title: "Goal", side_id: 1000000001 }],
	subjects: [
		{
			id: "SUB",
			goal_id: "GOAL",
			title: "Subject",
			subject_type: "asset",
			target_team_id: 2000000002,
			owner_side_id: 2000000001,
		},
	],
	sub_subjects: [
		{ id: "SS", subject_id: "SUB", title: "Sub", progress_share: 100 },
	],
	scenarios: [
		{
			id: "SCN",
			sub_subject_id: "SS",
			title: "Scenario",
			scenario_type: "attack_path",
			execution_mode: "ordered",
		},
	],
	scenario_steps: [
		{
			id: "STEP",
			scenario_id: "SCN",
			order: 1,
			action_code: "ACT",
			required: true,
		},
	],
	impact_rules: [],
	visibility_config: {
		events: Object.fromEntries(
			REQUIRED_VISIBILITY_EVENT_TYPES.map((eventType) => [
				eventType,
				{ audiences: [] },
			]),
		) as ConfigureAllRequestV2["visibility_config"]["events"],
		cross_side_result: { enabled: true, grantees: [] },
	},
});

describe("game-plan localization and mapping", () => {
	it("prefers Persian and falls back to English", () => {
		expect(getLocalized("English", "فارسی")).toBe("فارسی");
		expect(getLocalized("English", "")).toBe("English");
	});

	it("normalizes the legacy is_leader field without mutating input", () => {
		const raw = createPlan() as unknown as Record<string, unknown>;
		const teams = raw.teams as Array<Record<string, unknown>>;
		const players = teams[0]?.players as Array<Record<string, unknown>>;
		if (players[0]) {
			delete players[0].isLeader;
			players[0].is_leader = true;
		}
		const normalized = normalizeDefaultGamePlan(raw);
		expect(normalized.teams[0]?.players[0]?.isLeader).toBe(true);
		expect(normalized.teams[0]?.players[0]).not.toHaveProperty("is_leader");
		expect((players[0] as Record<string, unknown>).isLeader).toBeUndefined();
	});
});

describe("client-side validation", () => {
	it("validates registered team members and government operator synchronization", () => {
		const plan = createPlan();
		plan.government = {
			enabled: true,
			side_governments: [
				{
					side_id: 1000000001,
					team_id: 1000000001,
					player: { userId: 9999999999 },
				},
			],
		};
		plan.teams[1]?.players.push({ userId: 1000000001 });

		const issues = validateTeamMemberAssignments(
			plan,
			[1000000001, 1000000002, 2000000001, 2000000002],
		);

		expect(issues.map((issue) => issue.code)).toEqual(
			expect.arrayContaining([
				"USER_ASSIGNED_TO_MULTIPLE_TEAMS",
				"GOVERNMENT_OPERATOR_MISMATCH",
			]),
		);
	});

	it("requires exactly one registered member for each government team", () => {
		const plan = createPlan();
		if (plan.teams[0]) plan.teams[0].players = [];

		const issues = validateTeamMemberAssignments(
			plan,
			[1000000002, 2000000001, 2000000002],
		);

		expect(issues.map((issue) => issue.code)).toEqual(
			expect.arrayContaining([
				"TEAM_HAS_NO_MEMBERS",
				"GOVERNMENT_REQUIRES_ONE_MEMBER",
			]),
		);
	});

	it("accepts the supplied default civic-infrastructure plan after explicit mapping", () => {
		const raw = JSON.parse(
			readFileSync("apps/admin/public/data/default-game-plan.json", "utf8"),
		) as unknown;
		const result = validateDefaultGamePlanClientSide(
			normalizeDefaultGamePlan(raw),
		);
		expect(result.errors).toEqual([]);
	});

	it("requires subject shares to total 100", () => {
		const plan = createPlan();
		expect(validateSubjectShares(plan, "SUB")).toBe(true);
		if (plan.sub_subjects[0]) plan.sub_subjects[0].progress_share = 80;
		expect(
			validateDefaultGamePlanClientSide(plan).errors.some(
				(error) => error.code === "SHARES_NOT_100",
			),
		).toBe(true);
	});

	it("requires steps to reference an action and ordered steps to have order", () => {
		const plan = createPlan();
		if (plan.scenario_steps[0]) {
			plan.scenario_steps[0].action_code = "MISSING";
			plan.scenario_steps[0].order = null;
		}
		const codes = validateDefaultGamePlanClientSide(plan).errors.map(
			(error) => error.code,
		);
		expect(codes).toContain("MISSING_ACTION");
		expect(codes).toContain("ORDER_REQUIRED");
	});
});

describe("graph and runtime rules", () => {
	it("generates the hierarchy and action execution edge", () => {
		const graph = buildGamePlanGraph(createPlan());
		expect(graph.nodes.some((node) => node.id === "goal:GOAL")).toBe(true);
		expect(
			graph.edges.some(
				(edge) => edge.type === "executes" && edge.target === "action:ACT",
			),
		).toBe(true);
	});

	it("gates selection and voting to their phases", () => {
		expect(canSelectScenario("SELECTION")).toBe(true);
		expect(canSelectScenario("VOTING")).toBe(false);
		expect(canVoteStep("VOTING")).toBe(true);
		expect(canVoteStep("CALCULATION")).toBe(false);
	});

	it("validates government order payloads", () => {
		expect(
			validateGovernmentOrderPayload({
				order_type: "ASSIGN_SUBJECT",
				target_team_id: 1,
				payload: { subject_id: "" },
			}).valid,
		).toBe(false);
		expect(
			validateGovernmentOrderPayload({
				order_type: "ALLOCATE_CREDIT",
				target_team_id: 1,
				payload: { amount: 20 },
			}).valid,
		).toBe(true);
	});

	it("enforces the communication permission matrix", () => {
		expect(canSendCommunication("ATTACKER", "TEAM_CHAT")).toBe(true);
		expect(canSendCommunication("ATTACKER", "GOVERNMENT_TO_ENEMY_TEAM")).toBe(
			false,
		);
		expect(canSendCommunication("GOVERNMENT", "THREAT_SIMULATION")).toBe(true);
	});
});

describe("errors and lock reasons", () => {
	it("parses 409 code before message and returns every reason", () => {
		const parsed = parseApiError({
			response: {
				status: 409,
				data: {
					detail: {
						code: "STEP_LOCKED",
						detail: "locked",
						reasons: [
							{
								code: "MISSING_PREREQUISITE_STEP",
								message: "first",
								source: "STEP_1",
							},
							{
								code: "ACTION_BANNED_BY_GOVERNMENT",
								message: "second",
								source: "ORDER_1",
							},
						],
					},
				},
			},
		});
		expect(parsed.status).toBe(409);
		expect(parsed.code).toBe("STEP_LOCKED");
		expect(parsed.reasons).toHaveLength(2);
	});

	it("formats known lock reasons in Persian", () => {
		expect(formatLockReasonFa("SUBJECT_NOT_ASSIGNED")).toContain("تخصیص");
	});
});
