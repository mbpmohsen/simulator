import { describe, expect, it } from "vitest";
import type {
	ActionConfigRequest,
	ConfigureAllRequestV2,
} from "../game-server/types";
import {
	buildEquilibrium,
	buildEquilibriumWithout,
	solveZeroSumGame,
} from "./equilibrium";

const RED_SIDE = 1100000001;
const BLUE_SIDE = 2200000001;
const RED_TEAM = 1100000102;
const BLUE_TEAM = 2200000102;

interface MoveSpec {
	code: string;
	cost: number;
	probability: number;
	points: number;
}

const action = (
	spec: MoveSpec,
	type: "attack" | "defense",
): ActionConfigRequest => ({
	code: spec.code,
	name: spec.code,
	type,
	base_stats: {
		cost: spec.cost,
		success_probability: spec.probability,
		points_on_success: spec.points,
		cooldown_turns: 0,
	},
});

const createPlan = (
	attacks: MoveSpec[],
	defenses: MoveSpec[],
	counters: Array<[string, string, number]>,
): ConfigureAllRequestV2 =>
	({
		version: "2.0",
		game_config: { num_turns: 6, point_threshold: 5 },
		teams: [
			{
				id: RED_TEAM,
				name: "Red Team",
				side_id: RED_SIDE,
				role: { type: "ATTACKER" },
				players: [],
			},
			{
				id: BLUE_TEAM,
				name: "Blue Team",
				side_id: BLUE_SIDE,
				role: { type: "DEFENCER" },
				players: [],
			},
		],
		actions: [
			...attacks.map((spec) => action(spec, "attack")),
			...defenses.map((spec) => action(spec, "defense")),
		],
		action_counters: counters.map(([attackCode, defenseCode, effectiveness]) => ({
			attack_code: attackCode,
			countered_by: [{ defense_code: defenseCode, effectiveness }],
		})),
		goals: [],
		subjects: [],
		sub_subjects: [],
		scenarios: [],
		scenario_steps: [],
		impact_rules: [],
		visibility_config: { events: {}, cross_side_result: { enabled: false } },
	}) as unknown as ConfigureAllRequestV2;

/** The configuration shipped in apps/admin/public/data/demo-game-plan.json. */
const shippedPlan = (): ConfigureAllRequestV2 =>
	createPlan(
		[
			{ code: "ATK_PROBE_ACCESS", cost: 8, probability: 90, points: 1 },
			{ code: "ATK_DISRUPT_WORKFLOW", cost: 12, probability: 45, points: 2 },
			{ code: "ATK_BLACKOUT_SERVICE", cost: 16, probability: 30, points: 3 },
		],
		[
			{ code: "DEF_HARDEN_IDENTITY", cost: 8, probability: 74, points: 1 },
			{ code: "DEF_CONTAIN_TRIAGE", cost: 12, probability: 40, points: 2 },
			{ code: "DEF_RESTORE_CONTINUITY", cost: 16, probability: 28, points: 3 },
		],
		[
			["ATK_PROBE_ACCESS", "DEF_HARDEN_IDENTITY", 78],
			["ATK_DISRUPT_WORKFLOW", "DEF_CONTAIN_TRIAGE", 62],
			["ATK_BLACKOUT_SERVICE", "DEF_RESTORE_CONTINUITY", 48],
		],
	);

const weights = (strategies: Array<{ weight: number }>): number[] =>
	strategies.map((strategy) => strategy.weight);

describe("solveZeroSumGame", () => {
	it("splits matching pennies evenly", () => {
		const solution = solveZeroSumGame([
			[1, -1],
			[-1, 1],
		]);
		expect(solution).not.toBeNull();
		expect(solution?.value).toBeCloseTo(0, 6);
		expect(solution?.row[0]).toBeCloseTo(0.5, 6);
		expect(solution?.column[0]).toBeCloseTo(0.5, 6);
	});

	it("finds a pure saddle point", () => {
		const solution = solveZeroSumGame([
			[4, 3],
			[2, 1],
		]);
		expect(solution?.value).toBeCloseTo(3, 6);
		expect(solution?.row[0]).toBeCloseTo(1, 6);
		expect(solution?.column[1]).toBeCloseTo(1, 6);
	});

	it("handles an all-negative matrix", () => {
		const solution = solveZeroSumGame([
			[-1, -3],
			[-4, -2],
		]);
		expect(solution).not.toBeNull();
		expect(solution?.value).toBeCloseTo(-2.5, 6);
		expect(solution?.row[0]).toBeCloseTo(0.5, 6);
	});

	it("returns null for an empty game", () => {
		expect(solveZeroSumGame([])).toBeNull();
	});

	it("produces strategies that sum to one", () => {
		const solution = solveZeroSumGame([
			[0.198, 0.9, 0.9],
			[0.9, 0.342, 0.9],
			[0.9, 0.9, 0.468],
		]);
		const total = (values: number[] = []): number =>
			values.reduce((sum, value) => sum + value, 0);
		expect(total(solution?.row)).toBeCloseTo(1, 9);
		expect(total(solution?.column)).toBeCloseTo(1, 9);
	});
});

describe("buildEquilibrium - shipped demo configuration", () => {
	const result = buildEquilibrium(shippedPlan());

	it("solves", () => {
		expect(result.solvable).toBe(true);
	});

	it("matches the reference attacker mix", () => {
		const [probe, disrupt, blackout] = weights(result.attacks);
		expect(probe).toBeCloseTo(0.344833, 5);
		expect(disrupt).toBeCloseTo(0.326295, 5);
		expect(blackout).toBeCloseTo(0.328872, 5);
	});

	it("matches the reference defender mix", () => {
		const [harden, contain, restore] = weights(result.defenses);
		expect(harden).toBeCloseTo(0.257529, 5);
		expect(contain).toBeCloseTo(0.323988, 5);
		expect(restore).toBeCloseTo(0.418484, 5);
	});

	it("matches the reference value and expected points", () => {
		expect(result.value).toBeCloseTo(-0.082073, 5);
		expect(result.attackerExpectedPoints).toBeCloseTo(0.719215, 5);
		expect(result.defenderExpectedPoints).toBeCloseTo(0.801288, 5);
	});

	it("reports the expected spend per turn", () => {
		expect(result.attackerExpectedCost).toBeCloseTo(11.936156, 4);
		expect(result.defenderExpectedCost).toBeCloseTo(12.643821, 4);
	});

	it("keeps every move in the equilibrium", () => {
		expect(result.attacks.every((strategy) => !strategy.dominated)).toBe(true);
		expect(result.defenses.every((strategy) => !strategy.dominated)).toBe(true);
		expect(
			result.warnings.filter((warning) => warning.code === "DOMINATED_MOVE"),
		).toHaveLength(0);
	});

	it("builds the payoff matrix the counters imply", () => {
		// Probe blocked by Harden: 0.90 * (1 - 0.78) * 1
		expect(result.attackPayoff[0]?.[0]).toBeCloseTo(0.198, 6);
		// Probe against anything else is unblocked: 0.90 * 1
		expect(result.attackPayoff[0]?.[1]).toBeCloseTo(0.9, 6);
		expect(result.attackPayoff[2]?.[2]).toBeCloseTo(0.468, 6);
		// Defence scores on its own roll regardless of the attack played.
		expect(result.defensePayoff[0]?.[2]).toBeCloseTo(0.84, 6);
		expect(result.defensePayoff[2]?.[2]).toBeCloseTo(0.84, 6);
	});

	it("gives all three attacks equal expected value by design", () => {
		for (const strategy of result.attacks) {
			expect(strategy.move.expectedPoints).toBeCloseTo(0.9, 6);
		}
	});
});

describe("buildEquilibrium - government ban", () => {
	const result = buildEquilibriumWithout(
		shippedPlan(),
		"ATK_BLACKOUT_SERVICE",
	);

	it("drops the banned move and re-solves", () => {
		expect(result.attacks).toHaveLength(2);
		expect(result.excluded).toEqual(["ATK_BLACKOUT_SERVICE"]);
		expect(weights(result.attacks)[0]).toBeCloseTo(0.490476, 5);
		expect(weights(result.attacks)[1]).toBeCloseTo(0.509524, 5);
	});

	it("shifts the defender mix and strands Restore Continuity", () => {
		const [harden, contain, restore] = weights(result.defenses);
		expect(harden).toBeCloseTo(0.442857, 5);
		expect(contain).toBeCloseTo(0.557143, 5);
		// Restore was the most-played defence before the ban; with nothing left to
		// block it stops being worth its cost even though it was not banned.
		expect(restore).toBeCloseTo(0, 6);
	});

	it("flags the stranded defence as dominated", () => {
		expect(
			result.warnings.some(
				(warning) =>
					warning.code === "DOMINATED_MOVE" &&
					warning.subject === "DEF_RESTORE_CONTINUITY",
			),
		).toBe(true);
	});

	it("moves the value against the attacker", () => {
		expect(result.value).toBeCloseTo(-0.184314, 5);
	});
});

describe("buildEquilibrium - balance diagnostics", () => {
	it("detects a dominated move in an unbalanced plan", () => {
		const result = buildEquilibrium(
			createPlan(
				[
					{ code: "ATK_STRONG", cost: 10, probability: 80, points: 3 },
					{ code: "ATK_WEAK", cost: 10, probability: 10, points: 1 },
				],
				[{ code: "DEF_ONLY", cost: 10, probability: 50, points: 1 }],
				[["ATK_STRONG", "DEF_ONLY", 20]],
			),
		);
		const weak = result.attacks.find(
			(strategy) => strategy.move.code === "ATK_WEAK",
		);
		expect(weak?.dominated).toBe(true);
		expect(
			result.warnings.some(
				(warning) =>
					warning.code === "DOMINATED_MOVE" && warning.subject === "ATK_WEAK",
			),
		).toBe(true);
	});

	it("warns about an attack with no counter", () => {
		const result = buildEquilibrium(
			createPlan(
				[
					{ code: "ATK_COVERED", cost: 10, probability: 60, points: 2 },
					{ code: "ATK_UNBLOCKABLE", cost: 10, probability: 60, points: 2 },
				],
				[{ code: "DEF_ONE", cost: 10, probability: 60, points: 2 }],
				[["ATK_COVERED", "DEF_ONE", 70]],
			),
		);
		expect(
			result.warnings.some(
				(warning) =>
					warning.code === "ATTACK_HAS_NO_COUNTER" &&
					warning.subject === "ATK_UNBLOCKABLE",
			),
		).toBe(true);
	});

	it("warns about an action that cannot score", () => {
		const result = buildEquilibrium(
			createPlan(
				[
					{ code: "ATK_SCOUT", cost: 8, probability: 90, points: 0 },
					{ code: "ATK_REAL", cost: 10, probability: 60, points: 2 },
				],
				[{ code: "DEF_ONE", cost: 10, probability: 60, points: 2 }],
				[["ATK_REAL", "DEF_ONE", 70]],
			),
		);
		expect(
			result.warnings.some(
				(warning) =>
					warning.code === "MOVE_SCORES_NOTHING" &&
					warning.subject === "ATK_SCOUT",
			),
		).toBe(true);
		expect(
			result.attacks.find((strategy) => strategy.move.code === "ATK_SCOUT")
				?.weight,
		).toBeCloseTo(0, 6);
	});

	it("reports an unsolvable plan rather than throwing", () => {
		const result = buildEquilibrium(
			createPlan([{ code: "ATK_ONE", cost: 10, probability: 60, points: 2 }], [], []),
		);
		expect(result.solvable).toBe(false);
		expect(
			result.warnings.some((warning) => warning.code === "NO_DEFENSE_ACTIONS"),
		).toBe(true);
	});

	it("survives a plan with no counters at all", () => {
		const result = buildEquilibrium(
			createPlan(
				[{ code: "ATK_ONE", cost: 10, probability: 60, points: 2 }],
				[{ code: "DEF_ONE", cost: 10, probability: 60, points: 2 }],
				[],
			),
		);
		expect(result.solvable).toBe(true);
		expect(weights(result.attacks)[0]).toBeCloseTo(1, 6);
	});
});
