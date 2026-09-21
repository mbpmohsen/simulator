import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ConfigureAllRequestV2 } from "../game-server/types";
import {
	balancePlanShares,
	createPlanChild,
	planShareTotal,
	previewPlanRemoval,
	removePlanAction,
	removePlanNode,
	renamePlanActionCode,
	renamePlanNode,
	scaffoldPlanLane,
	scenarioMoveRows,
	setPlanCounter,
	setScenarioMoveProgress,
	setScenarioMoveUses,
} from "./structure";
import { validateDefaultGamePlanClientSide } from "./validation";

const demo = (): ConfigureAllRequestV2 =>
	JSON.parse(
		readFileSync(
			resolve(__dirname, "../../../apps/admin/public/data/demo-game-plan.json"),
			"utf8",
		),
	) as ConfigureAllRequestV2;

const structuralErrors = (plan: ConfigureAllRequestV2) =>
	validateDefaultGamePlanClientSide(plan).errors.filter(
		(error) => error.group !== "visibility",
	);

describe("plan structure", () => {
	it("starts from a structurally valid demo", () => {
		expect(structuralErrors(demo())).toEqual([]);
	});

	it("creates children already linked to their parent", () => {
		const plan = demo();
		const subject = createPlanChild(plan, "goal", "GOAL_RED_PRESSURE");
		const created = subject.plan.subjects.find(
			(item) => item.id === subject.id,
		);
		expect(created?.goal_id).toBe("GOAL_RED_PRESSURE");
		expect(created?.owner_side_id).toBe(1100000001);
		expect(created?.target_team_id).toBe(2200000102);

		const scenario = createPlanChild(plan, "sub_subject", "SS_BLUE_POWER");
		const scn = scenario.plan.scenarios.find((item) => item.id === scenario.id);
		expect(scn?.scenario_type).toBe("defense_path");
		expect(scn?.allowed_team_roles).toEqual(["DEFENCER"]);
	});

	it("removes a subtree without leaving orphans", () => {
		const plan = demo();
		const preview = previewPlanRemoval(plan, "sub_subject", "SS_RED_HOSPITAL");
		expect(preview.scenarios).toEqual(["SCN_RED_HOSPITAL"]);
		expect(preview.steps).toHaveLength(18);
		const next = removePlanNode(plan, "goal", "GOAL_RED_PRESSURE");
		expect(next.scenario_steps).toHaveLength(54);
		const orphanCodes = structuralErrors(next).map((error) => error.code);
		expect(orphanCodes).not.toContain("MISSING_GOAL");
		expect(orphanCodes).not.toContain("MISSING_SUBJECT");
		expect(orphanCodes).not.toContain("MISSING_SCENARIO");
	});

	it("renames an id and every reference to it", () => {
		const result = renamePlanNode(
			demo(),
			"sub_subject",
			"SS_RED_HOSPITAL",
			"SS_RED_CLINIC",
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(structuralErrors(result.plan)).toEqual([]);
		expect(
			result.plan.scenario_steps.some((step) =>
				step.on_success?.some((effect) => effect.target === "SS_RED_CLINIC"),
			),
		).toBe(true);
		expect(
			renamePlanNode(demo(), "scenario", "SCN_RED_POWER", "SCN_RED_WATER"),
		).toEqual({ ok: false, reason: "taken" });
	});

	it("renames an action code across steps, counters and the market", () => {
		const result = renamePlanActionCode(
			demo(),
			"ATK_BLACKOUT_SERVICE",
			"ATK_BLACKOUT",
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(structuralErrors(result.plan)).toEqual([]);
		expect(
			result.plan.action_counters?.some(
				(counter) => counter.attack_code === "ATK_BLACKOUT",
			),
		).toBe(true);
		expect(
			result.plan.black_market?.some(
				(item) => item.target?.action_code === "ATK_BLACKOUT",
			),
		).toBe(true);
	});

	it("reads a checklist scenario as moves x uses and writes it back", () => {
		let plan = demo();
		const rows = scenarioMoveRows(plan, "SCN_RED_HOSPITAL");
		expect(
			rows.map((row) => [row.actionCode, row.stepIds.length, row.progress]),
		).toEqual([
			["ATK_PROBE_ACCESS", 6, 8],
			["ATK_DISRUPT_WORKFLOW", 6, 16],
			["ATK_BLACKOUT_SERVICE", 6, 24],
		]);
		plan = setScenarioMoveUses(
			plan,
			"SCN_RED_HOSPITAL",
			"ATK_BLACKOUT_SERVICE",
			2,
		);
		plan = setScenarioMoveUses(plan, "SCN_RED_HOSPITAL", "ATK_PROBE_ACCESS", 8);
		const after = scenarioMoveRows(plan, "SCN_RED_HOSPITAL");
		expect(after.map((row) => row.stepIds.length)).toEqual([8, 6, 2]);
		const orders = plan.scenario_steps
			.filter((step) => step.scenario_id === "SCN_RED_HOSPITAL")
			.map((step) => step.order)
			.sort((a, b) => (a ?? 0) - (b ?? 0));
		expect(orders).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
		expect(structuralErrors(plan)).toEqual([]);

		plan = setScenarioMoveProgress(
			plan,
			"SCN_RED_HOSPITAL",
			"ATK_PROBE_ACCESS",
			10,
		);
		expect(scenarioMoveRows(plan, "SCN_RED_HOSPITAL")[0]?.progress).toBe(10);
	});

	it("scaffolds a whole lane in one call", () => {
		const plan = demo();
		const lane = scaffoldPlanLane(plan, "SUBJ_RED_INFRA");
		const rows = scenarioMoveRows(lane.plan, lane.scenarioId);
		expect(rows).toHaveLength(3);
		expect(rows.every((row) => row.stepIds.length === 6)).toBe(true);
		// Progress effects are borrowed from the same moves elsewhere and retargeted.
		expect(rows.map((row) => row.progress)).toEqual([8, 16, 24]);
		const balanced = balancePlanShares(lane.plan, "SUBJ_RED_INFRA");
		expect(planShareTotal(balanced, "SUBJ_RED_INFRA")).toBe(100);
		expect(structuralErrors(balanced)).toEqual([]);
	});

	it("edits counters and removes an action cleanly", () => {
		let plan = setPlanCounter(
			demo(),
			"ATK_PROBE_ACCESS",
			"DEF_CONTAIN_TRIAGE",
			30,
		);
		expect(
			plan.action_counters
				?.find((counter) => counter.attack_code === "ATK_PROBE_ACCESS")
				?.countered_by?.map((item) => item.defense_code),
		).toEqual(["DEF_HARDEN_IDENTITY", "DEF_CONTAIN_TRIAGE"]);
		plan = removePlanAction(plan, "DEF_CONTAIN_TRIAGE");
		expect(plan.scenario_steps).toHaveLength(90);
		expect(
			structuralErrors(plan).some((error) => error.code === "MISSING_ACTION"),
		).toBe(false);
	});
});
