import type {
	GameClientApi,
	GovernmentCatalogAction,
	GovernmentCatalogSubject,
} from "@workspace/trpc";
import { describe, expect, it } from "vitest";
import { createAiAssistantApi } from "@/lib/aiAssistantApi";
import {
	formatSubjectAiInsightText,
	generateSubjectAiInsight,
} from "@/lib/subjectAiInsightGenerator";

const subject: GovernmentCatalogSubject = {
	id: "SUBJECT_WATER",
	goal_id: "GOAL_RESILIENCE",
	title: "Water Plant",
	title_fa: "تصفیه‌خانه آب",
	subject_type: "critical_infrastructure",
	target_team_id: 101,
	owner_side_id: 10,
	criticality: 5,
	sub_subjects: [
		{
			id: "SUB_WATER_ACCESS",
			subject_id: "SUBJECT_WATER",
			title: "Access",
			title_fa: "دسترسی",
			progress_share: 50,
			scenarios: [
				{
					id: "SCN_FAST",
					sub_subject_id: "SUB_WATER_ACCESS",
					title: "Fast path",
					title_fa: "مسیر سریع",
					scenario_type: "attack_path",
					execution_mode: "ordered",
					base_reward_points: 8,
					base_credit_cost: 70,
					risk_level: "medium",
					steps: [
						{
							id: "STEP_A",
							scenario_id: "SCN_FAST",
							order: 1,
							action_code: "ACTION_A",
							required: true,
						},
						{
							id: "STEP_B",
							scenario_id: "SCN_FAST",
							order: 2,
							action_code: "ACTION_B",
							required: true,
						},
					],
				},
			],
		},
		{
			id: "SUB_WATER_DEFENSE",
			subject_id: "SUBJECT_WATER",
			title: "Defense",
			title_fa: "دفاع",
			progress_share: 50,
			scenarios: [
				{
					id: "SCN_SAFE",
					sub_subject_id: "SUB_WATER_DEFENSE",
					title: "Safe path",
					title_fa: "مسیر امن",
					scenario_type: "defense_path",
					execution_mode: "checklist",
					base_reward_points: 5,
					base_credit_cost: 35,
					risk_level: "low",
					steps: [
						{
							id: "STEP_C",
							scenario_id: "SCN_SAFE",
							order: 1,
							action_code: "ACTION_C",
							required: false,
						},
					],
				},
			],
		},
	],
};

const actionsByCode: Record<string, GovernmentCatalogAction> = {
	ACTION_A: {
		code: "ACTION_A",
		name: "Action A",
		name_fa: "کنش الف",
		type: "attack",
		base_stats: {
			cost: 80,
			success_probability: 60,
			points_on_success: 7,
			cooldown_turns: 2,
		},
	},
	ACTION_B: {
		code: "ACTION_B",
		name: "Action B",
		name_fa: "کنش ب",
		type: "attack",
		base_stats: {
			cost: 120,
			success_probability: 40,
			points_on_success: 12,
			cooldown_turns: 3,
		},
	},
	ACTION_C: {
		code: "ACTION_C",
		name: "Action C",
		name_fa: "کنش ج",
		type: "defense",
		base_stats: {
			cost: 40,
			success_probability: 80,
			points_on_success: 4,
			cooldown_turns: 0,
		},
	},
};

describe("subject AI insight generator", () => {
	it("calculates subject, scenario, step, cost, and success metrics", () => {
		const insight = generateSubjectAiInsight({
			aiLevel: 2,
			subject,
			actionsByCode,
			runtimeProgress: { progress_percent: 25, status: "active" },
		});

		expect(insight.key_numbers.sub_subject_count).toBe(2);
		expect(insight.key_numbers.scenario_count).toBe(2);
		expect(insight.key_numbers.step_count).toBe(3);
		expect(insight.key_numbers.average_cost).toBe(80);
		expect(insight.key_numbers.average_success_probability).toBe(60);
		expect(insight.key_numbers.max_points_on_success).toBe(12);
		expect(insight.key_numbers.average_cooldown_turns).toBe(1.7);
	});

	it("changes output depth by AI level", () => {
		const level1 = generateSubjectAiInsight({
			aiLevel: 1,
			subject,
			actionsByCode,
		});
		const level2 = generateSubjectAiInsight({
			aiLevel: 2,
			subject,
			actionsByCode,
		});
		const level3 = generateSubjectAiInsight({
			aiLevel: 3,
			subject,
			actionsByCode,
		});

		expect(level1.headline_fa).toContain("تحلیل AI سطح پایه");
		expect(formatSubjectAiInsightText(level2)).toContain("میانگین هزینه");
		expect(formatSubjectAiInsightText(level3)).toContain("نوبت بعدی");
		expect(level3.recommended_focus_fa.length).toBeGreaterThan(
			level1.recommended_focus_fa.length,
		);
	});

	it("keeps Persian output useful when numeric action metrics are absent", () => {
		const insight = generateSubjectAiInsight({
			aiLevel: 2,
			subject,
			actionsByCode: {},
		});
		const text = formatSubjectAiInsightText(insight);

		expect(text).not.toContain("نامشخص");
		expect(text).not.toContain("cooldown");
		expect(text).toContain("تحلیل AI");
		expect(text).toContain("هزینه");
		expect(insight.risks_fa.length).toBeGreaterThan(0);
	});
});

describe("AI Assistant API adapter", () => {
	const purchaseResponse = {
		ok: true,
		team_id: 101,
		level: 1,
		cost: 50,
		credits_after: 150,
		turn: 2,
	} as const;

	it("returns a Persian unavailable state for AI_CONFIG_NOT_SET", async () => {
		const client: Pick<
			GameClientApi,
			"getPlayerAiLevel" | "purchasePlayerAiLevel"
		> = {
			getPlayerAiLevel: async () => {
				throw {
					response: {
						status: 404,
						data: { detail: { code: "AI_CONFIG_NOT_SET" } },
					},
				};
			},
			purchasePlayerAiLevel: async () => purchaseResponse,
		};

		const state = await createAiAssistantApi("token", client).getLevel(
			"player",
		);
		expect(state.status).toBe("unconfigured");
		expect(state.message).toContain("فعال");
	});

	it("handles government role/API mismatch without crashing", async () => {
		const client: Pick<
			GameClientApi,
			"getPlayerAiLevel" | "purchasePlayerAiLevel"
		> = {
			getPlayerAiLevel: async () => {
				throw { response: { status: 403, data: { detail: "forbidden" } } };
			},
			purchasePlayerAiLevel: async () => purchaseResponse,
		};

		const state = await createAiAssistantApi("token", client).getLevel(
			"government",
		);
		expect(state.status).toBe("role_unsupported");
		expect(state.message).toContain("endpoint سطح دستیار دولت");
	});
});
