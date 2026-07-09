import { type AxiosAdapter, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { createGameClientApi } from "./router";

interface CapturedRequest {
	method?: string;
	url?: string;
}

describe("GameClientApi AI Assistant contract", () => {
	it("reads the team's AI level and purchases the next level", async () => {
		const requests: CapturedRequest[] = [];
		const adapter: AxiosAdapter = async (request) => {
			requests.push({
				method: request.method,
				url: request.url,
			});
			return {
				data: request.url?.endsWith("/purchase")
					? {
							ok: true,
							team_id: 3000000002,
							level: 2,
							cost: 120,
							credits_after: 80,
							turn: 5,
						}
					: {
							team_id: 3000000002,
							current_level: 1,
							next_level: 2,
							next_cost: 120,
							can_afford: true,
							already_purchased_this_turn: false,
							credits: 200,
						},
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config: request,
			};
		};
		const api = createGameClientApi({
			baseURL: "https://simulator.test",
			headers: { Authorization: "Bearer player-token" },
			axiosConfig: { adapter },
		});

		await api.getPlayerAiLevel();
		await api.purchasePlayerAiLevel();

		expect(requests).toEqual([
			{ method: "get", url: "/client/player/ai/level" },
			{ method: "post", url: "/client/player/ai/purchase" },
		]);
	});
});
