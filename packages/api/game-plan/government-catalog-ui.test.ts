import { type AxiosAdapter, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getGovernmentCatalogErrorMessageFa } from "@/lib/governmentRuntimeApi";
import { createGameClientApi } from "../game-client/router";
import type {
	GovernmentCatalogResponse,
	GovernmentOrder,
} from "../game-server/types";
import {
	GOVERNMENT_CATALOG_LABELS_FA,
	getGovernmentCatalogGoalLabel,
	getGovernmentCatalogNodes,
	getGovernmentCatalogPrefill,
	getGovernmentCatalogSubjectLabel,
	getGovernmentCatalogTeamLabel,
	getGovernmentOrderTargetTeams,
	normalizeGovernmentCatalog,
	validateGovernmentOrderAgainstCatalog,
} from "./government-catalog";

const rawCatalog = {
	sideId: 10,
	governmentTeamId: 199,
	goals: [
		{
			id: "GOAL_1",
			title: "Resilience",
			titleFa: "تاب‌آوری",
			subjects: [
				{
					id: "SUBJECT_1",
					title: "Water",
					titleFa: "آب",
					subjectType: "critical_infrastructure",
					targetTeamId: 101,
					ownerSideId: 10,
					subSubjects: [
						{
							id: "SUB_1",
							title: "Control",
							progressShare: 100,
							scenarios: [
								{
									id: "SCENARIO_1",
									title: "Defense",
									scenarioType: "defense_path",
									executionMode: "ordered",
									steps: [
										{
											id: "STEP_1",
											order: 1,
											actionCode: "DEF_WATER",
											required: true,
										},
									],
								},
							],
						},
					],
				},
			],
		},
	],
	teams: [
		{
			id: 101,
			name: "Red Team",
			displayNameFa: "تیم قرمز",
			sideId: 10,
			role: { type: "ATTACKER" },
		},
		{
			id: 199,
			name: "Government",
			sideId: 10,
			role: "GOVERNMENT",
		},
	],
	bannableActions: [
		{
			actionCode: "DEF_WATER",
			name: "Water defense",
			nameFa: "دفاع آب",
			category: "defense",
		},
	],
};

const catalog: GovernmentCatalogResponse = normalizeGovernmentCatalog({
	success: true,
	data: rawCatalog,
});

const subjectOrder = (
	type: "ASSIGN_SUBJECT" | "FORCE_SUBJECT",
	subjectId = "SUBJECT_1",
): GovernmentOrder => ({
	order_type: type,
	target_team_id: 101,
	payload: { subject_id: subjectId },
});

const actionOrder = (
	type: "BAN_ACTION" | "UNBAN_ACTION",
	actionCode = "DEF_WATER",
): GovernmentOrder =>
	type === "BAN_ACTION"
		? {
				order_type: type,
				target_team_id: 101,
				payload: { action_code: actionCode, duration: 2 },
			}
		: {
				order_type: type,
				target_team_id: 101,
				payload: { action_code: actionCode },
			};

describe("Government catalog API and UI contract", () => {
	it("1. getGovernmentCatalog calls /government/catalog", async () => {
		const requests: string[] = [];
		const adapter: AxiosAdapter = async (request) => {
			requests.push(request.url ?? "");
			return {
				data: rawCatalog,
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config: request,
			};
		};
		const api = createGameClientApi({
			baseURL: "https://simulator.test",
			axiosConfig: { adapter },
		});
		await api.getGovernmentCatalog();
		expect(requests).toEqual(["/government/catalog"]);
	});

	it("2. normalizes camelCase nested backend responses", () => {
		expect(catalog.side_id).toBe(10);
		expect(catalog.subjects[0]?.goal_id).toBe("GOAL_1");
		expect(
			catalog.subjects[0]?.sub_subjects[0]?.scenarios[0]?.steps[0],
		).toMatchObject({
			id: "STEP_1",
			scenario_id: "SCENARIO_1",
			action_code: "DEF_WATER",
		});
		expect(catalog.bannable_actions[0]?.code).toBe("DEF_WATER");
	});

	it("3. derives goal dropdown values and Persian labels from catalog.goals", () => {
		expect(
			catalog.goals.map((goal) => ({
				value: goal.id,
				label: getGovernmentCatalogGoalLabel(goal),
			})),
		).toEqual([{ value: "GOAL_1", label: "تاب‌آوری" }]);
	});

	it("4. accepts ASSIGN_SUBJECT IDs from catalog subjects", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(
				catalog,
				subjectOrder("ASSIGN_SUBJECT"),
			).valid,
		).toBe(true);
	});

	it("5. accepts FORCE_SUBJECT IDs from catalog subjects", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(
				catalog,
				subjectOrder("FORCE_SUBJECT"),
			).valid,
		).toBe(true);
	});

	it("6. accepts BAN_ACTION codes from catalog.bannable_actions", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(catalog, actionOrder("BAN_ACTION"))
				.valid,
		).toBe(true);
	});

	it("7. accepts UNBAN_ACTION codes from catalog.bannable_actions", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(
				catalog,
				actionOrder("UNBAN_ACTION"),
			).valid,
		).toBe(true);
	});

	it("8. derives the target team selector from catalog teams", () => {
		expect(
			getGovernmentOrderTargetTeams(catalog).map((team) => ({
				id: team.id,
				label: getGovernmentCatalogTeamLabel(team),
			})),
		).toEqual([{ id: 101, label: "تیم قرمز" }]);
	});

	it("9. blocks a subject ID that is absent from the catalog", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(
				catalog,
				subjectOrder("ASSIGN_SUBJECT", "UNKNOWN"),
			),
		).toEqual({
			valid: false,
			message: GOVERNMENT_CATALOG_LABELS_FA.subjectUnavailable,
		});
	});

	it("10. blocks an action code that is absent from the catalog", () => {
		expect(
			validateGovernmentOrderAgainstCatalog(
				catalog,
				actionOrder("BAN_ACTION", "UNKNOWN"),
			),
		).toEqual({
			valid: false,
			message: GOVERNMENT_CATALOG_LABELS_FA.actionUnavailable,
		});
	});

	it("11. includes scenario steps in the lock-reason node selector", () => {
		expect(getGovernmentCatalogNodes(catalog)).toContainEqual(
			expect.objectContaining({ id: "STEP_1", type: "step" }),
		);
	});

	it("12. clicking a catalog subject maps to an order-form prefill", () => {
		expect(
			getGovernmentCatalogPrefill("subject", "SUBJECT_1", "ALLOCATE_CREDIT"),
		).toEqual({ orderType: "ASSIGN_SUBJECT", subjectId: "SUBJECT_1" });
		const subject = catalog.subjects[0];
		expect(subject).toBeDefined();
		if (subject) expect(getGovernmentCatalogSubjectLabel(subject)).toBe("آب");
	});

	it("13. clicking a catalog action maps to a ban-form prefill", () => {
		expect(
			getGovernmentCatalogPrefill("action", "DEF_WATER", "ENABLE_TEAM"),
		).toEqual({ orderType: "BAN_ACTION", actionCode: "DEF_WATER" });
	});

	it("14. renders Persian catalog labels", () => {
		expect(GOVERNMENT_CATALOG_LABELS_FA).toMatchObject({
			catalog: "کاتالوگ دولت",
			availableGoals: "هدف‌های قابل انتخاب",
			assignableSubjects: "موضوع‌های قابل تخصیص",
			sideTeams: "تیم‌های سمت شما",
			bannableActions: "کنش‌های قابل ممنوعیت",
			orderTargetTeam: "تیم هدف دستور",
			node: "گره",
		});
	});

	it("15. translates a 403 catalog error for Government users", () => {
		expect(
			getGovernmentCatalogErrorMessageFa({
				response: { status: 403, data: {} },
			}),
		).toBe("شما دسترسی دولت برای مشاهده کاتالوگ ندارید.");
	});
});
