import { describe, expect, it } from "vitest";
import {
	buildIncomingMoves,
	buildMoveResults,
	buildVulnerabilities,
} from "@/lib/moveResults";
import { hadNoRoll, outcomeWordingFa } from "@/lib/runtimeTranslationsFa";
import type { GameEvent } from "../game-client/types";

/**
 * The 2026-09-24 resolution contract, read from the shapes the server actually
 * sends. The point of these tests is the one thing the old screen got wrong: a
 * defence that never rolled is not a failure.
 */

let seq = 0;
const event = (type: string, payload: Record<string, unknown>): GameEvent =>
	({
		gameId: "g1",
		seq: ++seq,
		type,
		payload,
	}) as unknown as GameEvent;

const resolved = (payload: Record<string, unknown>) =>
	event("TEAM_ACTION_RESOLVED", payload);

describe("resolution outcomes", () => {
	it("never calls a defence that had nothing to repair a failure", () => {
		const wording = outcomeWordingFa("NOTHING_TO_REPAIR", false);
		expect(wording.tone).toBe("neutral");
		expect(wording.label).not.toContain("ناموفق");
		expect(hadNoRoll("NOTHING_TO_REPAIR")).toBe(true);
	});

	it("calls a lost roll a failure", () => {
		const wording = outcomeWordingFa("PROBABILITY_FAILURE", false);
		expect(wording.tone).toBe("failure");
		expect(hadNoRoll("PROBABILITY_FAILURE")).toBe(false);
	});

	it("falls back to the success flag for a reason it has never seen", () => {
		expect(outcomeWordingFa("SOMETHING_NEW", true).tone).toBe("success");
		expect(outcomeWordingFa(null, false).tone).toBe("failure");
		// A raw server code must never reach the screen.
		expect(outcomeWordingFa("SOMETHING_NEW", true).label).not.toContain(
			"SOMETHING",
		);
	});

	it("reads the roll and the counter gate off an actor resolution", () => {
		seq = 0;
		const results = buildMoveResults([
			resolved({
				role: "actor",
				actionName: "ATK_PROBE_ACCESS",
				success: true,
				turn: 3,
				pointsDelta: 2,
				creditsAfter: 64,
				outcomeReason: "PROBABILITY_SUCCESS",
				baseProbability: 90,
				appliedProbability: 90,
				roll: 33.62,
				counterActionCode: "DEF_HARDEN_IDENTITY",
				counterEffectiveness: 60,
				counterRoll: 62.96,
				blockedByCounter: false,
			}),
			event("SCENARIO_STEP_RESOLVED", {
				action_code: "ATK_PROBE_ACCESS",
				sub_subject_id: "SS_RED_HOSPITAL",
				step_id: "STEP_1",
				result: "success",
				effects: [
					{ type: "ADVANCE_PROGRESS", target: "SS_RED_HOSPITAL", value: 8 },
				],
			}),
		]);
		expect(results).toHaveLength(1);
		const [only] = results;
		expect(only.turn).toBe(3);
		expect(only.appliedProbability).toBe(90);
		expect(only.roll).toBeCloseTo(33.62);
		expect(only.counterActionCode).toBe("DEF_HARDEN_IDENTITY");
		expect(only.blockedByCounter).toBe(false);
		expect(only.progress).toBe(8);
	});

	it("keeps a resolution that never reached a scenario step", () => {
		seq = 0;
		const results = buildMoveResults([
			resolved({
				role: "actor",
				actionName: "DEF_HARDEN_IDENTITY",
				success: false,
				turn: 1,
				outcomeReason: "NOTHING_TO_REPAIR",
				guardActive: true,
				guardsAgainstActionCode: "ATK_PROBE_ACCESS",
			}),
		]);
		expect(results).toHaveLength(1);
		expect(results[0].outcomeReason).toBe("NOTHING_TO_REPAIR");
		expect(results[0].guardActive).toBe(true);
	});

	it("reads both opponent roles and never confuses them", () => {
		seq = 0;
		const moves = buildIncomingMoves([
			resolved({
				role: "target",
				actionName: "ATK_PROBE_ACCESS",
				success: true,
				turn: 2,
				actorTeamName: "Red Team",
				sub_subject_id: "SS_BLUE_HOSPITAL",
			}),
			resolved({
				role: "counterparty",
				actionName: "DEF_HARDEN_IDENTITY",
				success: true,
				turn: 2,
				actorTeamName: "Blue Team",
			}),
			resolved({ role: "actor", actionName: "ATK_PROBE_ACCESS", turn: 2 }),
		]);
		expect(moves.map((move) => move.role)).toEqual(["target", "counterparty"]);
		expect(moves[0].siteId).toBe("SS_BLUE_HOSPITAL");
		expect(moves[1].opponentTeamName).toBe("Blue Team");
	});
});

describe("standing vulnerabilities", () => {
	it("opens on a successful attack and closes only on a winning repair", () => {
		seq = 0;
		const hit = resolved({
			role: "target",
			actionName: "ATK_PROBE_ACCESS",
			success: true,
			turn: 1,
			actorTeamName: "Red Team",
		});
		const lostRepair = resolved({
			role: "actor",
			actionName: "DEF_HARDEN_IDENTITY",
			success: false,
			turn: 2,
			outcomeReason: "PROBABILITY_FAILURE",
			guardActive: true,
			guardsAgainstActionCode: "ATK_PROBE_ACCESS",
		});
		const wonRepair = resolved({
			role: "actor",
			actionName: "DEF_HARDEN_IDENTITY",
			success: true,
			turn: 3,
			outcomeReason: "PROBABILITY_SUCCESS",
			guardActive: true,
			guardsAgainstActionCode: "ATK_PROBE_ACCESS",
		});

		expect([...buildVulnerabilities([hit]).exposedTo.keys()]).toEqual([
			"ATK_PROBE_ACCESS",
		]);
		// A lost roll leaves the exposure standing - that is the harsh part.
		expect([
			...buildVulnerabilities([hit, lostRepair]).exposedTo.keys(),
		]).toEqual(["ATK_PROBE_ACCESS"]);
		expect([
			...buildVulnerabilities([hit, lostRepair, wonRepair]).exposedTo.keys(),
		]).toEqual([]);
	});

	it("tracks the opening this team made in the opponent", () => {
		seq = 0;
		const ourHit = resolved({
			role: "actor",
			actionName: "ATK_PROBE_ACCESS",
			success: true,
			turn: 1,
			outcomeReason: "PROBABILITY_SUCCESS",
		});
		const theirRepair = resolved({
			role: "counterparty",
			actionName: "DEF_HARDEN_IDENTITY",
			success: true,
			turn: 2,
			outcomeReason: "PROBABILITY_SUCCESS",
			guardActive: true,
			guardsAgainstActionCode: "ATK_PROBE_ACCESS",
		});
		expect([
			...buildVulnerabilities([ourHit]).opponentExposedTo.keys(),
		]).toEqual(["ATK_PROBE_ACCESS"]);
		expect([
			...buildVulnerabilities([ourHit, theirRepair]).opponentExposedTo.keys(),
		]).toEqual([]);
	});

	it("does not open an exposure when a counter blocked the attack", () => {
		seq = 0;
		const blocked = resolved({
			role: "target",
			actionName: "ATK_PROBE_ACCESS",
			success: false,
			turn: 1,
			outcomeReason: "BLOCKED_BY_COUNTER",
			blockedByCounter: true,
		});
		expect([...buildVulnerabilities([blocked]).exposedTo.keys()]).toEqual([]);
	});
});
