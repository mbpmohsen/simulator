import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
	AdminLoginRequest,
	AuthResponse,
	ConfigureAllRequest,
	ConfigureDirectivesRequest,
	ConfigureEventsRequest,
	CurrentEventsResponse,
	DetailResponse,
	EventStreamQuery,
	GenericResponse,
	ListUsersQuery,
	UsersResponse,
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
	signup(payload: UserSignupRequest, config?: AxiosRequestConfig): Promise<AuthResponse>;
	login(payload: UserLoginRequest, config?: AxiosRequestConfig): Promise<AuthResponse>;
	adminLogin(
		payload: AdminLoginRequest,
		config?: AxiosRequestConfig,
	): Promise<AuthResponse>;
	configureAll(
		payload: ConfigureAllRequest,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	addEvents(
		payload: ConfigureEventsRequest,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	deleteEvent(
		eventName: string,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	clearEvents(config?: AxiosRequestConfig): Promise<GenericResponse>;
	startGame(gameId: string, config?: AxiosRequestConfig): Promise<DetailResponse>;
	resetGame(gameId: string, config?: AxiosRequestConfig): Promise<DetailResponse>;
	getAdminGameState(config?: AxiosRequestConfig): Promise<GenericResponse>;
	listUsers(query?: ListUsersQuery, config?: AxiosRequestConfig): Promise<UsersResponse>;
	health(config?: AxiosRequestConfig): Promise<GenericResponse>;
	getEvents(
		gameId: string,
		query?: EventStreamQuery,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	getEventsStatus(gameId: string, config?: AxiosRequestConfig): Promise<GenericResponse>;
	getReadiness(gameId: string, config?: AxiosRequestConfig): Promise<GenericResponse>;
	getEventsAdminAll(gameId: string, config?: AxiosRequestConfig): Promise<GenericResponse>;
	clearGameEvents(gameId: string, config?: AxiosRequestConfig): Promise<GenericResponse>;
	configureDirectives(
		payload: ConfigureDirectivesRequest,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	addDirectives(
		payload: ConfigureDirectivesRequest,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	deleteDirective(
		directiveName: string,
		config?: AxiosRequestConfig,
	): Promise<GenericResponse>;
	clearDirectives(config?: AxiosRequestConfig): Promise<GenericResponse>;
	listDirectives(config?: AxiosRequestConfig): Promise<GenericResponse>;
	getActiveDirectives(config?: AxiosRequestConfig): Promise<GenericResponse>;
	getCurrentEvents(config?: AxiosRequestConfig): Promise<CurrentEventsResponse>;
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
			const { data } = await http.post<AuthResponse>(
				"/auth/signup",
				payload,
				requestConfig,
			);
			return data;
		},

		async login(payload, requestConfig) {
			const { data } = await http.post<AuthResponse>(
				"/auth/login",
				payload,
				requestConfig,
			);
			return data;
		},

		async adminLogin(payload, requestConfig) {
			const { data } = await http.post<AuthResponse>(
				"/auth/admin/login",
				payload,
				requestConfig,
			);
			return data;
		},

		async configureAll(payload, requestConfig) {
			const { data } = await http.post<GenericResponse>(
				"/admin/configure_all",
				payload,
				requestConfig,
			);
			return data;
		},

		async addEvents(payload, requestConfig) {
			const { data } = await http.post<GenericResponse>(
				"/admin/add_events",
				payload,
				requestConfig,
			);
			return data;
		},

		async deleteEvent(eventName, requestConfig) {
			const { data } = await http.delete<GenericResponse>(
				`/admin/delete_event/${encodeURIComponent(eventName)}`,
				requestConfig,
			);
			return data;
		},

		async clearEvents(requestConfig) {
			const { data } = await http.delete<GenericResponse>(
				"/admin/clear_events",
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
			const { data } = await http.get<GenericResponse>(
				"/admin/game_state",
				requestConfig,
			);
			return data;
		},

		async listUsers(query, requestConfig) {
			const { data } = await http.get<UsersResponse>("/admin/users", {
				...requestConfig,
				params: query,
			});
			return data;
		},

		async health(requestConfig) {
			const { data } = await http.get<GenericResponse>("/health", requestConfig);
			return data;
		},

		async getEvents(gameId, query, requestConfig) {
			const { data } = await http.get<GenericResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events`,
				{
					...requestConfig,
					params: query,
				},
			);
			return data;
		},

		async getEventsStatus(gameId, requestConfig) {
			const { data } = await http.get<GenericResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events/status`,
				requestConfig,
			);
			return data;
		},

		async getReadiness(gameId, requestConfig) {
			const { data } = await http.get<GenericResponse>(
				`/api/games/${encodeURIComponent(gameId)}/readiness`,
				requestConfig,
			);
			return data;
		},

		async getEventsAdminAll(gameId, requestConfig) {
			const { data } = await http.get<GenericResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events/admin/all`,
				requestConfig,
			);
			return data;
		},

		async clearGameEvents(gameId, requestConfig) {
			const { data } = await http.delete<GenericResponse>(
				`/api/games/${encodeURIComponent(gameId)}/events`,
				requestConfig,
			);
			return data;
		},

		async configureDirectives(payload, requestConfig) {
			const { data } = await http.post<GenericResponse>(
				"/configure_directives",
				payload,
				requestConfig,
			);
			return data;
		},

		async addDirectives(payload, requestConfig) {
			const { data } = await http.post<GenericResponse>(
				"/add_directives",
				payload,
				requestConfig,
			);
			return data;
		},

		async deleteDirective(directiveName, requestConfig) {
			const { data } = await http.delete<GenericResponse>(
				`/delete_directive/${encodeURIComponent(directiveName)}`,
				requestConfig,
			);
			return data;
		},

		async clearDirectives(requestConfig) {
			const { data } = await http.delete<GenericResponse>(
				"/clear_directives",
				requestConfig,
			);
			return data;
		},

		async listDirectives(requestConfig) {
			const { data } = await http.get<GenericResponse>(
				"/directives",
				requestConfig,
			);
			return data;
		},

		async getActiveDirectives(requestConfig) {
			const { data } = await http.get<GenericResponse>(
				"/active_directives",
				requestConfig,
			);
			return data;
		},

		async getCurrentEvents(requestConfig) {
			const { data } = await http.get<CurrentEventsResponse>(
				"/admin/get_current_events",
				requestConfig,
			);
			return data;
		},
	};
};
