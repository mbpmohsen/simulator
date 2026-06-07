export type ServerJsonPrimitive = string | number | boolean | null;
export type ServerJsonValue =
	| ServerJsonPrimitive
	| ServerJsonObject
	| ServerJsonValue[];

export interface ServerJsonObject {
	[key: string]: ServerJsonValue;
}

export interface ServerApiEnvelope<TData> {
	success?: boolean;
	data?: TData | null;
	error?: Record<string, unknown> | null;
	timestamp?: number;
	schemaVersion?: number;
	[key: string]: unknown;
}

export interface DetailResponse {
	detail: string;
}

export interface SignupRequest {
	username: string;
	password: string;
}

export type UserSignupRequest = SignupRequest;

export interface LoginRequest {
	username: string;
	password: string;
}

export type UserLoginRequest = LoginRequest;

export interface AdminLoginRequest {
	password: string;
}

export interface UserSummary {
	id: number;
	username: string;
}

export interface UserAuthData {
	token: string;
	user: UserSummary;
}

export interface AdminAuthData {
	token: string;
	role: string;
}

export type UserAuthResponse = ServerApiEnvelope<UserAuthData>;
export type AdminAuthResponse = ServerApiEnvelope<AdminAuthData>;
export type AuthResponse = UserAuthResponse | AdminAuthResponse;

export interface TeamPlayerRequest {
	userId: number;
	isLeader?: boolean;
	voteWeight?: number;
	[key: string]: unknown;
}

export type PlayerConfig = TeamPlayerRequest;

export interface TeamRoleRequest {
	type: string;
	allowed_action_types?: string[];
	description?: string;
	[key: string]: unknown;
}

export type TeamRole = TeamRoleRequest;

export interface TeamRequest {
	id?: number;
	name: string;
	side_id?: number;
	side_name?: string | null;
	display_name?: string | null;
	color?: string | null;
	icon?: string | null;
	starting_credits?: number;
	role: TeamRoleRequest | string;
	specializations?: Record<string, unknown>;
	players: TeamPlayerRequest[];
	[key: string]: unknown;
}

export type TeamConfig = TeamRequest;

export interface SideConfig {
	id?: number | null;
	name: string;
	credits?: number;
	teams?: TeamRequest[];
	[key: string]: unknown;
}

export interface GameConfigRequest {
	num_turns: number;
	point_threshold: number;
	turn_duration_seconds?: number;
	selection_phase_duration?: number;
	voting_phase_duration?: number;
	vote_time_limit_seconds?: number;
	voting_config?: Record<string, unknown>;
	victory_conditions?: Record<string, unknown>;
	[key: string]: unknown;
}

export type GameConfig = GameConfigRequest;

export interface ActionBaseStatsRequest {
	cost: number;
	success_probability: number;
	points_on_success?: number;
	cooldown_turns?: number;
	[key: string]: unknown;
}

export type ActionBaseStats = ActionBaseStatsRequest;

export interface ActionRequirementsRequest {
	unlocked_by_default?: boolean | null;
	allowed_team_ids?: number[];
	allowed_team_roles?: string[];
	prerequisites?: Record<string, unknown>[];
	alternative_unlock?: Record<string, unknown> | null;
	[key: string]: unknown;
}

export type ActionRequirements = ActionRequirementsRequest;

export interface ActionConfigRequest {
	code: string;
	name?: string | null;
	type: string;
	description?: string | null;
	base_stats: ActionBaseStatsRequest;
	requirements?: ActionRequirementsRequest;
	effects?: Record<string, unknown>;
	visual?: Record<string, unknown>;
	mitre_mapping?: Record<string, unknown>;
	[key: string]: unknown;
}

export type ActionConfig = ActionConfigRequest;

export interface CounterActionMapping {
	defense_code: string;
	effectiveness?: number;
	description?: string;
	[key: string]: unknown;
}

export interface ActionCounterRequest {
	attack_code: string;
	countered_by?: CounterActionMapping[];
	[key: string]: unknown;
}

export type AttackCounterMap = ActionCounterRequest;

export interface GovernmentPlayerRequest {
	userId: number;
	name?: string | null;
	governmentCode?: string | null;
	[key: string]: unknown;
}

export interface GovernmentActionBaseStatsRequest {
	cost?: number;
	success_probability?: number;
	cooldown_turns?: number;
	[key: string]: unknown;
}

export interface GovernmentActionRequest {
	code: string;
	name?: string | null;
	description?: string | null;
	intervention_type: string;
	base_stats?: GovernmentActionBaseStatsRequest;
	duration?: number;
	severity?: string | null;
	reason?: string | null;
	announcement?: string | null;
	icon?: string | null;
	alert_level?: string | null;
	credit_delta?: number;
	target_team_id?: number | null;
	target_team_ids?: number[];
	apply_to_all_teams_on_side?: boolean;
	banned_action_code?: string | null;
	target_action_code?: string | null;
	[key: string]: unknown;
}

export interface SideGovernmentRequest {
	side_id: number;
	team_id: number;
	player: GovernmentPlayerRequest;
	permissions?: Record<string, unknown>;
	intervention_config?: Record<string, unknown>;
	regulation_presets?: Record<string, unknown>[];
	event_triggers?: Record<string, unknown>[];
	dashboard_config?: Record<string, unknown>;
	actions?: GovernmentActionRequest[];
	[key: string]: unknown;
}

export interface GovernmentConfigRequest {
	enabled: boolean;
	side_governments: SideGovernmentRequest[];
	[key: string]: unknown;
}

export interface BlackMarketTargetRequest {
	action_code?: string | null;
	action_type?: string | null;
	[key: string]: unknown;
}

export type BlackMarketTarget = BlackMarketTargetRequest;

export interface BlackMarketEffectRequest {
	value: number;
	modifier_type?: string | null;
	description?: string;
	[key: string]: unknown;
}

export type BlackMarketEffect = BlackMarketEffectRequest;

export interface BlackMarketAvailabilityRequest {
	stock_limit?: number | null;
	per_team_limit?: number | null;
	available_from_turn?: number;
	unlocked_by_default?: boolean;
	[key: string]: unknown;
}

export type BlackMarketAvailability = BlackMarketAvailabilityRequest;

export interface BlackMarketItemRequest {
	code: string;
	name?: string | null;
	description?: string;
	item_type: string;
	effect_type: string;
	target?: BlackMarketTargetRequest;
	effect: BlackMarketEffectRequest;
	duration_turns?: number | null;
	cost: number;
	availability?: BlackMarketAvailabilityRequest;
	stackable?: boolean;
	visual?: Record<string, unknown>;
	[key: string]: unknown;
}

export type BlackMarketItemConfig = BlackMarketItemRequest;

export interface ConfigureAllRequest {
	version: string;
	game_config: GameConfigRequest;
	teams: TeamRequest[];
	actions: ActionConfigRequest[];
	government?: GovernmentConfigRequest | null;
	action_counters?: ActionCounterRequest[];
	black_market?: BlackMarketItemRequest[];
	max_players?: number | null;
	sides?: SideConfig[] | null;
	[key: string]: unknown;
}

export interface DirectiveConfig {
	id?: number | null;
	name: string;
	effect_type: string;
	target_action: string;
	target_action_type: string;
	value: number;
	start_turn: number;
	duration: number;
	modifier_type?: string;
	affected_sides?: string[] | null;
	limit_type?: string | null;
	limit_value?: number | null;
	[key: string]: unknown;
}

export interface ConfigureDirectivesRequest {
	directives: DirectiveConfig[];
}

export type AddDirectivesRequest = ConfigureDirectivesRequest;

export interface ListUsersQuery {
	skip?: number;
	limit?: number;
}

export interface EventStreamQuery {
	since?: number;
	types?: string;
}

export interface EventReplayQuery {
	since_seq?: number;
	until_seq?: number;
	types?: string;
	limit?: number;
}

export interface AdminEventListQuery {
	since_seq?: number;
	limit?: number;
}

export interface AdminUserSummary {
	id: number;
	username: string;
	created_at: number;
	updated_at: number;
}

export interface AdminUsersData {
	users: AdminUserSummary[];
	count: number;
}

export type AdminUsersResponse = ServerApiEnvelope<AdminUsersData>;

export interface EventVisibility {
	scope: string;
	teamId?: number | null;
	sideId?: number | null;
	userId?: number | null;
	[key: string]: unknown;
}

export interface GameEvent {
	seq: number;
	gameId: string;
	type: string;
	phase?: string | null;
	visibility: EventVisibility;
	payload: Record<string, unknown>;
	createdAt: string;
	schemaVersion?: number;
	[key: string]: unknown;
}

export interface EventReplayData {
	events: GameEvent[];
	count: number;
	currentSeq: number;
	hasMore: boolean;
}

export type EventReplayResponse = ServerApiEnvelope<EventReplayData>;

export interface EventStatusData {
	gameId: string;
	currentSeq: number;
	eventCount: number;
	streamEndpoint: string;
	replayEndpoint: string;
}

export type EventStatusResponse = ServerApiEnvelope<EventStatusData>;

export interface ReadinessTeamStatus {
	teamId: number;
	assignedCount: number;
	readyCount: number;
	presentCount: number;
	isReady: boolean;
	readyUserIds: number[];
	presentUserIds: number[];
}

export interface ReadinessStatusData {
	gameId: string;
	teams: ReadinessTeamStatus[];
	allTeamsReady: boolean;
	totalAssigned: number;
	totalPresent: number;
	message?: string | null;
}

export type ReadinessStatusResponse = ServerApiEnvelope<ReadinessStatusData>;

export interface ConfigureAllResponse extends Record<string, unknown> {
	detail: string;
	gameId: string;
	sides: unknown[];
	num_turns: number;
	point_threshold: number;
	actions: Record<string, unknown>;
	government: Record<string, unknown>;
	black_market_items: unknown[];
	events: unknown[];
}

export type DirectivesConfiguredResponse = ServerApiEnvelope<Record<string, unknown>>;
export type DirectivesAddedResponse = ServerApiEnvelope<Record<string, unknown>>;
export type DirectiveDeletedResponse = ServerApiEnvelope<Record<string, unknown>>;
export type DirectiveMessageResponse = ServerApiEnvelope<Record<string, unknown>>;
export type DirectivesListResponse = ServerApiEnvelope<Record<string, unknown>>;
export type ActiveDirectivesResponse = ServerApiEnvelope<Record<string, unknown>>;
export type AdminEventListResponse = ServerApiEnvelope<Record<string, unknown>>;
export type AdminClearEventsResponse = ServerApiEnvelope<Record<string, unknown>>;
export type AdminGameStateResponse = ServerApiEnvelope<Record<string, unknown>>;

export interface ServerHealthResponse {
	status: string;
	[key: string]: unknown;
}

export interface GenericResponse {
	[key: string]: unknown;
}
