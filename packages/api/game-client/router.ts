import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { normalizeGovernmentCatalog } from "../game-plan/government-catalog.ts";
import type {
	GoalSelectResponse,
	GovernmentCatalogResponse,
	GovernmentOrder,
	GovernmentOrderResultResponse,
	GovernmentOverviewResponse,
	GovernmentTeamProgress,
	LockReasonsResponse,
	OrderView,
	PlayerStateResponse,
	ScenarioView,
	SelectScenarioResponse,
	StepView,
	SubjectView,
	VoteStepResponse,
} from "../game-server/types.js";
import type {
	AvailableActionsResponse,
	AvailableTargetsResponse,
	ClientVoteActionRequest,
	ClientVoteActionResponse,
	GameStateResponse,
	HealthResponse,
} from "./types.js";

export interface GameClientApiConfig {
	baseURL: string;
	headers?: Record<string, string>;
	timeout?: number;
	axiosConfig?: AxiosRequestConfig;
}

export interface GameClientApi {
	getGameState(config?: AxiosRequestConfig): Promise<GameStateResponse>;
	getActions(config?: AxiosRequestConfig): Promise<AvailableActionsResponse>;
	getTargets(config?: AxiosRequestConfig): Promise<AvailableTargetsResponse>;
	voteAction(
		payload: ClientVoteActionRequest,
		config?: AxiosRequestConfig,
	): Promise<ClientVoteActionResponse>;
	health(config?: AxiosRequestConfig): Promise<HealthResponse>;
	getPlayerState(config?: AxiosRequestConfig): Promise<PlayerStateResponse>;
	getPlayerSubjects(config?: AxiosRequestConfig): Promise<SubjectView[]>;
	getPlayerScenarios(
		subSubjectId: string,
		config?: AxiosRequestConfig,
	): Promise<ScenarioView[]>;
	getPlayerScenarioSteps(
		scenarioId: string,
		config?: AxiosRequestConfig,
	): Promise<StepView[]>;
	getPlayerLockReasons(
		nodeId: string,
		config?: AxiosRequestConfig,
	): Promise<LockReasonsResponse>;
	selectPlayerScenario(
		scenarioId: string,
		config?: AxiosRequestConfig,
	): Promise<SelectScenarioResponse>;
	votePlayerStep(
		stepId: string,
		config?: AxiosRequestConfig,
	): Promise<VoteStepResponse>;
	getPlayerOrders(
		turn?: number,
		config?: AxiosRequestConfig,
	): Promise<OrderView[]>;
	selectGovernmentGoal(
		goalId: string,
		config?: AxiosRequestConfig,
	): Promise<GoalSelectResponse>;
	getGovernmentCatalog(
		config?: AxiosRequestConfig,
	): Promise<GovernmentCatalogResponse>;
	getGovernmentOverview(
		config?: AxiosRequestConfig,
	): Promise<GovernmentOverviewResponse>;
	getGovernmentTeamProgress(
		teamId: number,
		config?: AxiosRequestConfig,
	): Promise<GovernmentTeamProgress>;
	issueGovernmentOrder(
		order: GovernmentOrder,
		config?: AxiosRequestConfig,
	): Promise<GovernmentOrderResultResponse>;
	getGovernmentOrders(
		turn?: number,
		config?: AxiosRequestConfig,
	): Promise<OrderView[]>;
	getGovernmentLockReasons(
		teamId: number,
		nodeId: string,
		config?: AxiosRequestConfig,
	): Promise<LockReasonsResponse>;
}

const createHttpClient = (config: GameClientApiConfig): AxiosInstance => {
	return axios.create({
		baseURL: config.baseURL,
		headers: config.headers,
		timeout: config.timeout,
		...config.axiosConfig,
	});
};

export const createGameClientApi = (
	config: GameClientApiConfig,
): GameClientApi => {
	const http = createHttpClient(config);

	return {
		async getGameState(requestConfig) {
			const { data } = await http.get<GameStateResponse>(
				"/client/game_state",
				requestConfig,
			);
			return data;
		},

		async getActions(requestConfig) {
			const { data } = await http.get<AvailableActionsResponse>(
				"/client/actions",
				requestConfig,
			);
			return data;
		},

		async getTargets(requestConfig) {
			const { data } = await http.get<AvailableTargetsResponse>(
				"/client/targets",
				requestConfig,
			);
			return data;
		},

		async voteAction(payload, requestConfig) {
			const { data } = await http.post<ClientVoteActionResponse>(
				"/client/vote_action",
				payload,
				requestConfig,
			);
			return data;
		},

		async health(requestConfig) {
			const { data } = await http.get<HealthResponse>("/health", requestConfig);
			return data;
		},

		async getPlayerState(requestConfig) {
			const { data } = await http.get<PlayerStateResponse>(
				"/client/player/state",
				requestConfig,
			);
			return data;
		},

		async getPlayerSubjects(requestConfig) {
			const { data } = await http.get<SubjectView[]>(
				"/client/player/subjects",
				requestConfig,
			);
			return data;
		},

		async getPlayerScenarios(subSubjectId, requestConfig) {
			const { data } = await http.get<ScenarioView[]>(
				`/client/player/sub-subjects/${encodeURIComponent(subSubjectId)}/scenarios`,
				requestConfig,
			);
			return data;
		},

		async getPlayerScenarioSteps(scenarioId, requestConfig) {
			const { data } = await http.get<StepView[]>(
				`/client/player/scenarios/${encodeURIComponent(scenarioId)}/steps`,
				requestConfig,
			);
			return data;
		},

		async getPlayerLockReasons(nodeId, requestConfig) {
			const { data } = await http.get<LockReasonsResponse>(
				`/client/player/nodes/${encodeURIComponent(nodeId)}/lock-reasons`,
				requestConfig,
			);
			return data;
		},

		async selectPlayerScenario(scenarioId, requestConfig) {
			const { data } = await http.post<SelectScenarioResponse>(
				`/client/player/scenarios/${encodeURIComponent(scenarioId)}/select`,
				undefined,
				requestConfig,
			);
			return data;
		},

		async votePlayerStep(stepId, requestConfig) {
			const { data } = await http.post<VoteStepResponse>(
				`/client/player/steps/${encodeURIComponent(stepId)}/vote`,
				undefined,
				requestConfig,
			);
			return data;
		},

		async getPlayerOrders(turn, requestConfig) {
			const { data } = await http.get<OrderView[]>("/client/player/orders", {
				...requestConfig,
				params: turn === undefined ? undefined : { turn },
			});
			return data;
		},

		async selectGovernmentGoal(goalId, requestConfig) {
			const { data } = await http.post<GoalSelectResponse>(
				"/government/goal",
				{ goal_id: goalId },
				requestConfig,
			);
			return data;
		},

		async getGovernmentCatalog(requestConfig) {
			const { data } = await http.get<unknown>(
				"/government/catalog",
				requestConfig,
			);
			return normalizeGovernmentCatalog(data);
		},

		async getGovernmentOverview(requestConfig) {
			const { data } = await http.get<GovernmentOverviewResponse>(
				"/government/overview",
				requestConfig,
			);
			return data;
		},

		async getGovernmentTeamProgress(teamId, requestConfig) {
			const { data } = await http.get<GovernmentTeamProgress>(
				`/government/teams/${encodeURIComponent(teamId)}/progress`,
				requestConfig,
			);
			return data;
		},

		async issueGovernmentOrder(order, requestConfig) {
			const { data } = await http.post<GovernmentOrderResultResponse>(
				"/government/orders",
				order,
				requestConfig,
			);
			return data;
		},

		async getGovernmentOrders(turn, requestConfig) {
			const { data } = await http.get<OrderView[]>("/government/orders", {
				...requestConfig,
				params: turn === undefined ? undefined : { turn },
			});
			return data;
		},

		async getGovernmentLockReasons(teamId, nodeId, requestConfig) {
			const { data } = await http.get<LockReasonsResponse>(
				`/government/teams/${encodeURIComponent(teamId)}/nodes/${encodeURIComponent(nodeId)}/lock-reasons`,
				requestConfig,
			);
			return data;
		},
	};
};
