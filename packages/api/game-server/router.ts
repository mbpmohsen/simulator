import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
	ActiveDirectivesResponse,
	AddDirectivesRequest,
	AdminAuthResponse,
	AdminClearEventsResponse,
	AdminEventListQuery,
	AdminEventListResponse,
	AdminGameCatalogResponse,
	AdminGameStateResponse,
	AdminLoginRequest,
	AdminUsersResponse,
	ConfigureAllRequest,
	ConfigureAllRequestV2,
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
	EventStreamQuery,
	GamePlanGraphResponse,
	GamePlanValidationResponse,
	ListUsersQuery,
	ReadinessStatusResponse,
	ServerHealthResponse,
	SubjectStateResponse,
	TurnAnalyticsDetailResponse,
	TurnAnalyticsListQuery,
	TurnAnalyticsListResponse,
	TurnAnalyticsPlotResponse,
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
	streamFetch?: typeof fetch;
}

export interface GameServerApi {
	signup(
		payload: UserSignupRequest,
		config?: AxiosRequestConfig,
	): Promise<UserAuthResponse>;
	login(
		payload: UserLoginRequest,
		config?: AxiosRequestConfig,
	): Promise<UserAuthResponse>;
	adminLogin(
		payload: AdminLoginRequest,
		config?: AxiosRequestConfig,
	): Promise<AdminAuthResponse>;
	configureAll(
		payload: ConfigureAllRequest | ConfigureAllRequestV2,
		config?: AxiosRequestConfig,
	): Promise<ConfigureAllResponse>;
	validateGamePlan(
		payload: ConfigureAllRequestV2,
		config?: AxiosRequestConfig,
	): Promise<GamePlanValidationResponse>;
	getGamePlan(config?: AxiosRequestConfig): Promise<ConfigureAllRequestV2>;
	getGamePlanGraph(config?: AxiosRequestConfig): Promise<GamePlanGraphResponse>;
	getSubjectState(
		subjectId: string,
		config?: AxiosRequestConfig,
	): Promise<SubjectStateResponse>;
	startGame(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<DetailResponse>;
	pauseGame(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<DetailResponse>;
	resumeGame(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<DetailResponse>;
	resetGame(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<DetailResponse>;
	getAdminGameState(
		config?: AxiosRequestConfig,
	): Promise<AdminGameStateResponse>;
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
	openEventsStream(
		gameId: string,
		query?: EventStreamQuery,
		init?: RequestInit,
	): Promise<Response>;
	getEventsStatus(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<EventStatusResponse>;
	getReadiness(
		gameId: string,
		config?: AxiosRequestConfig,
	): Promise<ReadinessStatusResponse>;
	getEventsAdminAll(
		gameId: string,
		query?: AdminEventListQuery,
		config?: AxiosRequestConfig,
	): Promise<AdminEventListResponse>;
	getAdminGameCatalog(
		config?: AxiosRequestConfig,
	): Promise<AdminGameCatalogResponse>;
	listTurnAnalytics(
		gameId: string,
		query?: TurnAnalyticsListQuery,
		config?: AxiosRequestConfig,
	): Promise<TurnAnalyticsListResponse>;
	getTurnAnalytics(
		gameId: string,
		turn: number,
		config?: AxiosRequestConfig,
	): Promise<TurnAnalyticsDetailResponse>;
	getTurnAnalyticsPlot(
		gameId: string,
		filename: string,
		config?: AxiosRequestConfig,
	): Promise<TurnAnalyticsPlotResponse>;
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
	clearDirectives(
		config?: AxiosRequestConfig,
	): Promise<DirectiveMessageResponse>;
	listDirectives(config?: AxiosRequestConfig): Promise<DirectivesListResponse>;
	getActiveDirectives(
		config?: AxiosRequestConfig,
	): Promise<ActiveDirectivesResponse>;
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

export const createGameServerApi = (
	config: GameServerApiConfig,
): GameServerApi => {
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

		async validateGamePlan(payload, requestConfig) {
			const { data } = await http.post<GamePlanValidationResponse>(
				"/admin/game_plan/validate",
				payload,
				requestConfig,
			);
			return data;
		},

		async getGamePlan(requestConfig) {
			const { data } = await http.get<ConfigureAllRequestV2>(
				"/admin/game_plan",
				requestConfig,
			);
			return data;
		},

		async getGamePlanGraph(requestConfig) {
			const { data } = await http.get<GamePlanGraphResponse>(
				"/admin/game_plan/graph",
				requestConfig,
			);
			return data;
		},

		async getSubjectState(subjectId, requestConfig) {
			const { data } = await http.get<SubjectStateResponse>(
				`/admin/subjects/${encodeURIComponent(subjectId)}/state`,
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

		async pauseGame(gameId, requestConfig) {
			const { data } = await http.post<DetailResponse>(
				`/api/games/${encodeURIComponent(gameId)}/pause`,
				undefined,
				requestConfig,
			);
			return data;
		},

		async resumeGame(gameId, requestConfig) {
			const { data } = await http.post<DetailResponse>(
				`/api/games/${encodeURIComponent(gameId)}/resume`,
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
			const { data } = await http.get<ServerHealthResponse>(
				"/health",
				requestConfig,
			);
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

		async openEventsStream(gameId, query, init) {
			const params = new URLSearchParams();
			if (query?.since !== undefined) params.set("since", String(query.since));
			if (query?.types) params.set("types", query.types);
			const suffix = params.size > 0 ? `?${params.toString()}` : "";
			const baseURL = config.baseURL.replace(/\/$/, "");
			const url = `${baseURL}/api/games/${encodeURIComponent(gameId)}/events/stream${suffix}`;
			const headers = new Headers();
			if (config.adminToken) {
				headers.set("Authorization", `Bearer ${config.adminToken}`);
			}
			for (const [name, value] of Object.entries(config.headers ?? {})) {
				headers.set(name, value);
			}
			new Headers(init?.headers).forEach((value, name) => {
				headers.set(name, value);
			});
			if (!headers.has("Accept")) headers.set("Accept", "text/event-stream");
			return (config.streamFetch ?? fetch)(url, {
				...init,
				method: "GET",
				headers,
			});
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

		async getAdminGameCatalog(requestConfig) {
			const { data } = await http.get<AdminGameCatalogResponse>(
				"/api/games/admin/catalog",
				requestConfig,
			);
			return data;
		},

		async listTurnAnalytics(gameId, query, requestConfig) {
			const { data } = await http.get<TurnAnalyticsListResponse>(
				`/api/games/${encodeURIComponent(gameId)}/admin/turn-analytics`,
				{
					...requestConfig,
					params: query,
				},
			);
			return data;
		},

		async getTurnAnalytics(gameId, turn, requestConfig) {
			const { data } = await http.get<TurnAnalyticsDetailResponse>(
				`/api/games/${encodeURIComponent(gameId)}/admin/turn-analytics/${encodeURIComponent(turn)}`,
				requestConfig,
			);
			return data;
		},

		async getTurnAnalyticsPlot(gameId, filename, requestConfig) {
			const { data } = await http.get<TurnAnalyticsPlotResponse>(
				`/api/games/${encodeURIComponent(gameId)}/admin/plots/${encodeURIComponent(filename)}`,
				{
					...requestConfig,
					responseType: "blob",
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
