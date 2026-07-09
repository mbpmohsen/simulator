import { type AxiosAdapter, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { createGameServerApi } from "./router";
import type {
	ConfigureAllRequestV2,
	TurnAnalyticsRecordedEvent,
} from "./types";

interface CapturedRequest {
	method?: string;
	url?: string;
	params?: unknown;
	responseType?: string;
	data?: unknown;
}

describe("GameServerApi admin lifecycle contract", () => {
	it("sends localized allowed action types to validate and configure_all", async () => {
		const requests: CapturedRequest[] = [];
		const adapter: AxiosAdapter = async (request) => {
			requests.push({
				method: request.method,
				url: request.url,
				data:
					typeof request.data === "string"
						? (JSON.parse(request.data) as unknown)
						: request.data,
			});
			return {
				data: request.url?.endsWith("/validate")
					? { valid: true, errors: [] }
					: { detail: "ok", gameId: "game-1" },
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config: request,
			};
		};
		const api = createGameServerApi({
			baseURL: "https://simulator.test",
			adminToken: "admin-token",
			axiosConfig: { adapter },
		});
		const payload = {
			version: "2.0",
			game_config: { num_turns: 1, point_threshold: 1 },
			teams: [
				{
					id: 1100000101,
					name: "Red Government",
					side_id: 1100000001,
					role: {
						type: "GOVERNMENT",
						allowed_action_types: ["government"],
						type_fa: "دولت",
						allowed_action_types_fa: ["دولتی"],
					},
					players: [{ userId: 9000000002 }],
				},
			],
			actions: [],
			goals: [],
			subjects: [],
			sub_subjects: [],
			scenarios: [],
			scenario_steps: [],
			impact_rules: [],
			visibility_config: {
				events: {},
				cross_side_result: { enabled: true, grantees: [] },
			},
		} satisfies ConfigureAllRequestV2;

		await api.validateGamePlan(payload);
		await api.configureAll(payload);

		expect(requests.map(({ url }) => url)).toEqual([
			"/admin/game_plan/validate",
			"/admin/configure_all",
		]);
		for (const request of requests) {
			expect(request.data).toMatchObject({
				teams: [
					{
						role: {
							allowed_action_types: ["government"],
							allowed_action_types_fa: ["دولتی"],
						},
					},
				],
			});
		}
	});

	it("uses game-scoped lifecycle, history, and stable analytics paths", async () => {
		const requests: CapturedRequest[] = [];
		const adapter: AxiosAdapter = async (request) => {
			requests.push({
				method: request.method,
				url: request.url,
				params: request.params,
				responseType: request.responseType,
			});
			return {
				data: request.url?.includes("/plots/")
					? new Blob(["plot"], { type: "image/png" })
					: { detail: "ok", success: true, data: {}, timestamp: 1 },
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config: request,
			};
		};
		const api = createGameServerApi({
			baseURL: "https://simulator.test",
			adminToken: "admin-token",
			axiosConfig: { adapter },
		});

		await api.startGame("game / 1");
		await api.pauseGame("game / 1");
		await api.resumeGame("game / 1");
		await api.resetGame("game / 1");
		await api.getAdminGameState();
		await api.getReadiness("game / 1");
		await api.getEventsStatus("game / 1");
		await api.getEvents("game / 1", {
			limit: 50,
			types: "TURN_STARTED,TURN_ENDED",
		});
		await api.getEventsAdminAll("game / 1", { limit: 100 });
		await api.getAdminGameCatalog();
		await api.listTurnAnalytics("game / 1", { since_turn: 2, limit: 20 });
		await api.getTurnAnalytics("game / 1", 3);
		await api.getTurnAnalyticsPlot("game / 1", "turn 3.png");

		expect(requests.map((request) => request.url)).toEqual([
			"/api/games/game%20%2F%201/start",
			"/api/games/game%20%2F%201/pause",
			"/api/games/game%20%2F%201/resume",
			"/api/games/game%20%2F%201/reset",
			"/admin/game_state",
			"/api/games/game%20%2F%201/readiness",
			"/api/games/game%20%2F%201/events/status",
			"/api/games/game%20%2F%201/events",
			"/api/games/game%20%2F%201/events/admin/all",
			"/api/games/admin/catalog",
			"/api/games/game%20%2F%201/admin/turn-analytics",
			"/api/games/game%20%2F%201/admin/turn-analytics/3",
			"/api/games/game%20%2F%201/admin/plots/turn%203.png",
		]);
		expect(requests[7]?.params).toEqual({
			limit: 50,
			types: "TURN_STARTED,TURN_ENDED",
		});
		expect(requests[12]?.responseType).toBe("blob");
	});

	it("sets and reads the AI Assistant ladder through the admin config endpoints", async () => {
		const requests: CapturedRequest[] = [];
		const adapter: AxiosAdapter = async (request) => {
			requests.push({
				method: request.method,
				url: request.url,
				data:
					typeof request.data === "string"
						? (JSON.parse(request.data) as unknown)
						: request.data,
			});
			return {
				data: {
					game_id: "game-1",
					levels: [
						{
							level: 1,
							cost: 50,
							name: "Basic",
							name_fa: "پایه",
						},
					],
				},
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config: request,
			};
		};
		const api = createGameServerApi({
			baseURL: "https://simulator.test",
			adminToken: "admin-token",
			axiosConfig: { adapter },
		});

		await api.setAiAssistantConfig({
			levels: [{ level: 1, cost: 50, name: "Basic", name_fa: "پایه" }],
		});
		await api.getAiAssistantConfig();

		expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
			{ method: "put", url: "/admin/ai/config" },
			{ method: "get", url: "/admin/ai/config" },
		]);
		expect(requests[0]?.data).toMatchObject({
			levels: [{ level: 1, cost: 50, name_fa: "پایه" }],
		});
	});

	it("opens the authenticated SSE stream with resume and type filters", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const streamFetch: typeof fetch = async (input, init) => {
			calls.push({ url: String(input), init });
			return new Response("event: keepalive\ndata: {}\n\n", {
				status: 200,
				headers: { "Content-Type": "text/event-stream" },
			});
		};
		const api = createGameServerApi({
			baseURL: "https://simulator.test/",
			adminToken: "admin-token",
			streamFetch,
		});

		const response = await api.openEventsStream("game / 1", {
			since: 42,
			types: "TURN_ANALYTICS_RECORDED,GAME_ENDED",
		});

		expect(response.ok).toBe(true);
		expect(calls[0]?.url).toBe(
			"https://simulator.test/api/games/game%20%2F%201/events/stream?since=42&types=TURN_ANALYTICS_RECORDED%2CGAME_ENDED",
		);
		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get("Authorization")).toBe("Bearer admin-token");
		expect(headers.get("Accept")).toBe("text/event-stream");
	});

	it("types TURN_ANALYTICS_RECORDED with a stable report payload", () => {
		const event: TurnAnalyticsRecordedEvent = {
			seq: 12,
			gameId: "game-1",
			type: "TURN_ANALYTICS_RECORDED",
			phase: "CALCULATION",
			visibility: { scope: "ADMIN" },
			payload: {
				turn: 3,
				report: { gameId: "game-1", turn: 3, plots: [] },
				message: "Turn analytics recorded",
			},
			createdAt: "2026-07-05T00:00:00.000Z",
		};
		expect(event.payload.report.turn).toBe(3);
	});
});
