import { describe, expect, it } from "vitest";
import { getIncomingGovernmentOrders } from "@/hooks/useIncomingOrderNotifications";
import { parseRuntimeApiError } from "@/lib/apiErrorParser";
import { parseSseBuffer } from "@/lib/gameEventsApi";
import { buildGovernmentOrder } from "@/lib/governmentRuntimeApi";
import {
	formatActionOptionFa,
	formatLockReasonsForDisplay,
	translateEventTypeFa,
} from "@/lib/runtimeTranslationsFa";
import {
	canSelectScenario,
	canVoteStep,
	validateGovernmentOrderPayload,
} from "./runtime";

describe("runtime API errors and Persian translations", () => {
	it("parses a 409 business conflict and every lock reason", () => {
		const parsed = parseRuntimeApiError({
			response: {
				status: 409,
				data: {
					detail: {
						code: "STEP_LOCKED",
						message: "locked",
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
		expect(parsed.reasons).toHaveLength(2);
		expect(parsed.message).toContain("قفل");
	});

	it("centralizes event and lock-reason Persian labels", () => {
		expect(translateEventTypeFa("SCENARIO_STEP_RESOLVED")).toBe(
			"نتیجه گام سناریو",
		);
		const reasons = formatLockReasonsForDisplay([
			{
				code: "SUBJECT_NOT_ASSIGNED",
				message: "fallback",
				source: null,
			},
		]);
		expect(reasons[0]?.message).toContain("تخصیص");
		expect(
			formatActionOptionFa({
				id: 1,
				category: "attack",
				name: "ATK_CREDENTIAL_PRESSURE_SIM",
				cost: 1,
				probability: 50,
			}),
		).toContain("اعتبارنامه");
	});
});

describe("runtime phase guards and order payloads", () => {
	it("disables scenario selection outside SELECTION", () => {
		expect(canSelectScenario("SELECTION")).toBe(true);
		expect(canSelectScenario("VOTING")).toBe(false);
	});

	it("disables step voting outside VOTING", () => {
		expect(canVoteStep("VOTING")).toBe(true);
		expect(canVoteStep("CALCULATION")).toBe(false);
	});

	it("builds and validates a Government order payload", () => {
		const order = buildGovernmentOrder({
			type: "BAN_ACTION",
			teamId: 1100000102,
			subjectId: "",
			actionCode: "ACTION_1",
			amount: 0,
			duration: 2,
			reason: "",
		});
		expect(order).toEqual({
			order_type: "BAN_ACTION",
			target_team_id: 1100000102,
			payload: { action_code: "ACTION_1", duration: 2 },
		});
		expect(validateGovernmentOrderPayload(order).valid).toBe(true);
	});
});

describe("lock rendering data and SSE parsing", () => {
	it("selects only unseen Government orders addressed to the current team", () => {
		const base = {
			gameId: "game-1",
			phase: "VOTING",
			visibility: { scope: "team" },
			createdAt: "2026-07-05T00:00:00.000Z",
		};
		const events = [
			{
				...base,
				seq: 8,
				type: "GOVERNMENT_ORDER_ISSUED",
				payload: {
					order_type: "ALLOCATE_CREDIT",
					government_team_id: 10,
					target_team_id: 101,
					subject_id: null,
					forced: false,
					message: "اعتبار تازه",
				},
			},
			{
				...base,
				seq: 7,
				type: "GOVERNMENT_ORDER_ISSUED",
				payload: {
					order_type: "DISABLE_TEAM",
					government_team_id: 10,
					target_team_id: 202,
					subject_id: null,
					forced: false,
					message: "برای تیم دیگر",
				},
			},
		];
		expect(getIncomingGovernmentOrders(events, new Set([7]), 101)).toEqual([
			events[0],
		]);
	});

	it("keeps every lock reason for rendering", () => {
		const reasons = formatLockReasonsForDisplay([
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
		]);
		expect(reasons.map((reason) => reason.code)).toEqual([
			"MISSING_PREREQUISITE_STEP",
			"ACTION_BANNED_BY_GOVERNMENT",
		]);
	});

	it("parses CRLF SSE blocks, ignores keepalive, and preserves remainder", () => {
		const parsed = parseSseBuffer(
			'id: 7\r\nevent: GOVERNMENT_ORDER_ISSUED\r\ndata: {"seq":7,"type":"GOVERNMENT_ORDER_ISSUED","payload":{"message":"دستور تازه"}}\r\n\r\nevent: keepalive\r\ndata: {}\r\n\r\nid: 8\r\n',
		);
		expect(parsed.events).toHaveLength(1);
		expect(parsed.events[0]?.seq).toBe(7);
		expect(parsed.events[0]?.payload.message).toBe("دستور تازه");
		expect(parsed.remainder).toContain("id: 8");
	});
});
