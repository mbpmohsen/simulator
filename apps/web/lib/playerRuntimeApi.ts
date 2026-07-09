import type {
	GameClientApi,
	LockReasonsResponse,
	OrderView,
	PlayerAiLevelResponse,
	PlayerAiPurchaseResponse,
	PlayerStateResponse,
	ScenarioView,
	SelectScenarioResponse,
	StepView,
	SubjectView,
	VoteStepResponse,
} from "@workspace/trpc";
import { createGameClientApi } from "@workspace/trpc";
import {
	loadRuntimeApiContext,
	type RuntimeApiContext,
} from "@/lib/runtimeApiContext";

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "";

export interface PlayerRuntimeApi {
	getState(): Promise<PlayerStateResponse>;
	getSubjects(): Promise<SubjectView[]>;
	getScenarios(subSubjectId: string): Promise<ScenarioView[]>;
	getScenarioSteps(scenarioId: string): Promise<StepView[]>;
	getLockReasons(nodeId: string): Promise<LockReasonsResponse>;
	selectScenario(scenarioId: string): Promise<SelectScenarioResponse>;
	voteStep(stepId: string): Promise<VoteStepResponse>;
	getOrders(turn?: number): Promise<OrderView[]>;
	getAiLevel(): Promise<PlayerAiLevelResponse>;
	purchaseAiLevel(): Promise<PlayerAiPurchaseResponse>;
	getRuntimeContext(): Promise<RuntimeApiContext>;
}

export const createPlayerRuntimeApi = (token: string): PlayerRuntimeApi => {
	const client: GameClientApi = createGameClientApi({
		baseURL: BASE_URL,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});
	return {
		getState: () => client.getPlayerState(),
		getSubjects: () => client.getPlayerSubjects(),
		getScenarios: (subSubjectId) => client.getPlayerScenarios(subSubjectId),
		getScenarioSteps: (scenarioId) => client.getPlayerScenarioSteps(scenarioId),
		getLockReasons: (nodeId) => client.getPlayerLockReasons(nodeId),
		selectScenario: (scenarioId) => client.selectPlayerScenario(scenarioId),
		voteStep: (stepId) => client.votePlayerStep(stepId),
		getOrders: (turn) => client.getPlayerOrders(turn),
		getAiLevel: () => client.getPlayerAiLevel(),
		purchaseAiLevel: () => client.purchasePlayerAiLevel(),
		getRuntimeContext: () => loadRuntimeApiContext(client),
	};
};
