import { describe, expect, it } from "vitest";
import { buildGameSummary, readVulnerabilities } from "@/lib/gameSummary";
import type { GameEvent } from "../game-client/types";

/**
 * The end-of-game report. The rule these tests protect: a team that scored
 * nothing did not necessarily do nothing, and the report has to be able to
 * prove it.
 */

let seq = 0;
const resolved = (payload: Record<string, unknown>): GameEvent =>
	({
		gameId: "g1",
		seq: ++seq,
		type: "TEAM_ACTION_RESOLVED",
		payload,
	}) as unknown as GameEvent;

const step = (payload: Record<string, unknown>): GameEvent =>
	({
		gameId: "g1",
		seq: ++seq,
		type: "SCENARIO_STEP_RESOLVED",
		payload,
	}) as unknown as GameEvent;

const attackWon = (turn: number, points: number) => [
	resolved({
		role: "actor",
		actionName: "ATK_PROBE_ACCESS",
		success: true,
		turn,
		pointsDelta: points,
		creditsAfter: 80 - turn * 8,
		outcomeReason: "PROBABILITY_SUCCESS",
		baseProbability: 90,
		appliedProbability: 90,
		roll: 33,
	}),
	step({
		action_code: "ATK_PROBE_ACCESS",
		sub_subject_id: "SS_BLUE_HOSPITAL",
		result: "success",
		effects: [
			{ type: "ADVANCE_PROGRESS", target: "SS_BLUE_HOSPITAL", value: 8 },
		],
	}),
];

describe("game report", () => {
	it("itemises every point with the move and turn that earned it", () => {
		seq = 0;
		const summary = buildGameSummary([...attackWon(1, 2), ...attackWon(2, 3)], {
			pointThreshold: 5,
		});
		expect(summary.scorecard.points).toBe(5);
		expect(summary.scorecard.scoringMoves).toEqual([
			{
				turn: 1,
				actionCode: "ATK_PROBE_ACCESS",
				siteId: "SS_BLUE_HOSPITAL",
				points: 2,
			},
			{
				turn: 2,
				actionCode: "ATK_PROBE_ACCESS",
				siteId: "SS_BLUE_HOSPITAL",
				points: 3,
			},
		]);
		expect(summary.turns.map((entry) => entry.pointsTotal)).toEqual([2, 5]);
	});

	it("calls the threshold-crossing turn the decisive one", () => {
		seq = 0;
		const summary = buildGameSummary(
			[...attackWon(1, 2), ...attackWon(2, 3), ...attackWon(3, 1)],
			{ pointThreshold: 5 },
		);
		expect(summary.decisive?.turn).toBe(2);
		expect(summary.decisive?.reason).toBe("threshold");
	});

	it("gives a team that never scored a record worth reading", () => {
		seq = 0;
		const summary = buildGameSummary([
			// Their attack, stopped by our counter.
			resolved({
				role: "target",
				actionName: "ATK_PROBE_ACCESS",
				success: false,
				turn: 1,
				outcomeReason: "BLOCKED_BY_COUNTER",
				blockedByCounter: true,
				actorTeamName: "Red Team",
			}),
			// Our defence that turn: guarding, nothing to repair.
			resolved({
				role: "actor",
				actionName: "DEF_HARDEN_IDENTITY",
				success: false,
				turn: 1,
				outcomeReason: "NOTHING_TO_REPAIR",
				guardActive: true,
				guardsAgainstActionCode: "ATK_PROBE_ACCESS",
			}),
			// Their attack lands next turn.
			resolved({
				role: "target",
				actionName: "ATK_BLACKOUT_SERVICE",
				success: true,
				turn: 2,
				outcomeReason: "PROBABILITY_SUCCESS",
				actorTeamName: "Red Team",
			}),
			// We repair it.
			resolved({
				role: "actor",
				actionName: "DEF_RESTORE_CONTINUITY",
				success: true,
				turn: 3,
				outcomeReason: "PROBABILITY_SUCCESS",
				guardActive: true,
				guardsAgainstActionCode: "ATK_BLACKOUT_SERVICE",
			}),
		]);

		const card = summary.scorecard;
		expect(card.points).toBe(0);
		// Zero points, and yet none of this is zero.
		expect(card.attacksBlocked).toBe(1);
		expect(card.repairsMade).toBe(1);
		expect(card.attacksAbsorbed).toBe(1);
		expect(card.guardTurns).toBe(2);
		expect(card.cleanTurns).toBe(2);
	});

	it("flags a predictable team and leaves a varied one alone", () => {
		seq = 0;
		const same = buildGameSummary([
			...attackWon(1, 1),
			...attackWon(2, 1),
			...attackWon(3, 1),
		]);
		expect(same.scorecard.favourite?.share).toBe(1);

		seq = 0;
		const varied = buildGameSummary([
			...attackWon(1, 1),
			resolved({
				role: "actor",
				actionName: "ATK_DISRUPT_WORKFLOW",
				success: false,
				turn: 2,
				outcomeReason: "PROBABILITY_FAILURE",
			}),
			resolved({
				role: "actor",
				actionName: "ATK_BLACKOUT_SERVICE",
				success: false,
				turn: 3,
				outcomeReason: "PROBABILITY_FAILURE",
			}),
		]);
		expect(varied.scorecard.favourite?.share).toBeCloseTo(1 / 3, 2);
	});

	it("reports nothing rather than guessing when the history is empty", () => {
		const summary = buildGameSummary([]);
		expect(summary.empty).toBe(true);
		expect(summary.decisive).toBeNull();
		expect(summary.turns).toEqual([]);
	});

	it("reads the server's own standing vulnerabilities", () => {
		expect(readVulnerabilities({ ATK_BLACKOUT_SERVICE: ["Red Team"] })).toEqual(
			[{ actionCode: "ATK_BLACKOUT_SERVICE", attackers: ["Red Team"] }],
		);
		expect(readVulnerabilities(undefined)).toEqual([]);
	});
});
