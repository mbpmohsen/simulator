import type { GameClientApi } from "@workspace/trpc";
import { createGameClientApi } from "@workspace/trpc";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

export const createSubjectScenarioApi = (token: string): GameClientApi =>
	createGameClientApi({
		baseURL: BASE_URL,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});

export { validateGovernmentOrderPayload } from "@workspace/trpc";
