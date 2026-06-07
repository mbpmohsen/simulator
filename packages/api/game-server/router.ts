import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
	AddDirectivesRequest,
	ActiveDirectivesResponse,
	AdminLoginRequest,
	AdminClearEventsResponse,
	AdminEventListQuery,
	AdminEventListResponse,
	AdminGameStateResponse,
	AdminUsersResponse,
	AdminAuthResponse,
	ConfigureAllRequest,
	ConfigureAllResponse,
	ConfigureDirectivesRequest,
	DetailResponse,
	DirectiveDeletedResponse,
	DirectiveMessageResponse,
	DirectivesAddedResponse,
	DirectivesConfiguredResponse,
	DirectivesListResponse,
	EventReplayQuery,
	EventReplayResponse,
	EventStatusResponse,
	ListUsersQuery,
	ReadinessStatusResponse,
	ServerHealthResponse,
	UserAuthResponse,
	UserLoginRequest,
	UserSignupRequest,
} from "./types.js";

export interface GameServerApiConfig {
	baseURL: string;
	adminToken?: string;
	headers?: Record<string, string>;
	timeout?: number;
	axiosConfig?: AxiosRequestConfig;
}

export interface GameServerApi {
	signup(payload: UserSignupRequest, config?: AxiosRequestConfig): Promise<UserAuthResponse>;
	login(payload: UserLoginRequest, config?: AxiosRequestConfig): Promise<UserAuthResponse>;
	adminLogin(
		payload: AdminLoginRequest,
		config?: AxiosRequestConfig,
	): Promise<AdminAuthResponse>;
	configureAll(
		payload: ConfigureAllRequest,
		config?: AxiosRequestConfig,
	): Promise<ConfigureAllResponse>;
	startGame(gameId: string, config?: AxiosRequestConfig): Promise<DetailResponse>;
	resetGame(gameId: string, config?: AxiosRequestConfig): Promise<DetailResponse>;
	getAdminGameState(config?: AxiosRequestConfig): Promise<AdminGameStateResponse>;
	listUsers(
		query?: ListUsersQuery,
		config?: AxiosRequestConfig,
	): Promise<AdminUsersResponse>;
	health(config?: AxiosRequestConfig): Promise<ServerHealthResponse>;
	getEvents(
		gameId: string,
		query?: EventReplayQuery,
		config?: AxiosRequestConfig,
	): Promise<EventReplayResponse>;
	getEventsStatus(gameId: string, config?: AxiosRequestConfig): Promise<EventStatusResponse>;
	getReadiness(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<ReadinessStatusResponse>;
	getEventsAdminAll(
		gameId: string,
		query?: AdminEventListQuery,
		config?: AxiosRequestConfig,
	): Promise<AdminEventListResponse>;
	clearGameEvents(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<AdminClearEventsResponse>;
	configureDirectives(
		payload: ConfigureDirectivesRequest,
		config?: AxiosRequestConfig,
	): Promise<DirectivesConfiguredResponse>;
	addDirectives(
		payload: AddDirectivesRequest,
		config?: AxiosRequestConfig,
	): Promise<DirectivesAddedResponse>;
	deleteDirective(
		directiveName: string,
		config?: AxiosRequestConfig,
	): Promise<DirectiveDeletedResponse>;
	clearDirectives(config?: AxiosRequestConfig): Promise<DirectiveMessageResponse>;
	listDirectives(config?: AxiosRequestConfig): Promise<DirectivesListResponse>;
	getActiveDirectives(config?: AxiosRequestConfig): Promise<ActiveDirectivesResponse>;
}

const createHttpClient = (config: GameServerApiConfig): AxiosInstance => {
	const authHeader = config.adminToken
		? { Authorization: `Bearer ${config.adminToken}` }
		: undefined;

	return axios.create({
		baseURL: config.baseURL,
		headers: {
			...authHeader,
			...config.headers,
		},
		timeout: config.timeout,
		...config.axiosConfig,
	});
};

export const createGameServerApi = (config: GameServerApiConfig): GameServerApi => {
	const http = createHttpClient(config);

	return {
		async signup(payload, requestConfig) {
			const { data } = await http.post<UserAuthResponse>(
				"/auth/signup",
				payload,
				requestConfig,
			);
			return data;
		},

		async login(payload, requestConfig) {
			const { data } = await http.post<UserAuthResponse>(
				"/auth/login",
				payload,
				requestConfig,
			);
			return data;
		},

		async adminLogin(payload, requestConfig) {
			const { data } = await http.post<AdminAuthResponse>(
				"/auth/admin/login",
				payload,
				requestConfig,
			);
			return data;
		},

		async configureAll(payload, requestConfig) {
			const { data } = await http.post<ConfigureAllResponse>(
				"/admin/configure_all",
				payload,
				requestConfig,
			);
			return data;
		},

		async startGame(gameId, requestConfig) {
			const { data } = await http.post<DetailResponse>(
				`/api/games/${encodeURIComponent(gameId)}/start`,
				undefined,
				requestConfig,
			);
			return data;
		},

		async resetGame(gameId, requestConfig) {
			const { data } = await http.post<DetailResponse>(
				`/api/games/${encodeURIComponent(gameId)}/reset`,
				undefined,
				requestConfig,
			);
			return data;
		},

		async getAdminGameState(requestConfig) {
			const { data } = await http.get<AdminGameStateResponse>(
				"/admin/game_state",
				requestConfig,
			);
			return data;
		},

		async listUsers(query, requestConfig) {
			const { data } = await http.get<AdminUsersResponse>("/admin/users", {
				...requestConfig,
				params: query,
			});
			return data;
		},

		async health(requestConfig) {
			const { data } = await http.get<ServerHealthResponse>("/health", requestConfig);
			return data;
		},

		async getEvents(gameId, query, requestConfig) {
			const { data } = await http.get<EventReplayResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events`,
				{
					...requestConfig,
					params: query,
				},
			);
			return data;
		},

		async getEventsStatus(gameId, requestConfig) {
			const { data } = await http.get<EventStatusResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events/status`,
				requestConfig,
			);
			return data;
		},

		async getReadiness(gameId, requestConfig) {
			const { data } = await http.get<ReadinessStatusResponse>(
				`/api/games/${encodeURIComponent(gameId)}/readiness`,
				requestConfig,
			);
			return data;
		},

		async getEventsAdminAll(gameId, query, requestConfig) {
			const { data } = await http.get<AdminEventListResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events/admin/all`,
				{
					...requestConfig,
					params: query,
				},
			);
			return data;
		},

		async clearGameEvents(gameId, requestConfig) {
			const { data } = await http.delete<AdminClearEventsResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events`,
				requestConfig,
			);
			return data;
		},

		async configureDirectives(payload, requestConfig) {
			const { data } = await http.post<DirectivesConfiguredResponse>(
				"/admin/configure_directives",
				payload,
				requestConfig,
			);
			return data;
		},

		async addDirectives(payload, requestConfig) {
			const { data } = await http.post<DirectivesAddedResponse>(
				"/admin/add_directives",
				payload,
				requestConfig,
			);
			return data;
		},

		async deleteDirective(directiveName, requestConfig) {
			const { data } = await http.delete<DirectiveDeletedResponse>(
				`/admin/delete_directive/${encodeURIComponent(directiveName)}`,
				requestConfig,
			);
			return data;
		},

		async clearDirectives(requestConfig) {
			const { data } = await http.delete<DirectiveMessageResponse>(
				"/admin/clear_directives",
				requestConfig,
			);
			return data;
		},

		async listDirectives(requestConfig) {
			const { data } = await http.get<DirectivesListResponse>(
				"/admin/directives",
				requestConfig,
			);
			return data;
		},

		async getActiveDirectives(requestConfig) {
			const { data } = await http.get<ActiveDirectivesResponse>(
				"/admin/active_directives",
				requestConfig,
			);
			return data;
		},
	};
};
