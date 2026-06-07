import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
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
}

const createHttpClient = (config: GameClientApiConfig): AxiosInstance => {
	return axios.create({
		baseURL: config.baseURL,
		headers: config.headers,
		timeout: config.timeout,
		...config.axiosConfig,
	});
};

export const createGameClientApi = (config: GameClientApiConfig): GameClientApi => {
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
	};
};
