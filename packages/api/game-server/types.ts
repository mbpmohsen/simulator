export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
	[key: string]: JsonValue;
}

export interface DetailResponse {
	detail: string;
}

export interface UserSignupRequest {
	username: string;
	password: string;
}

export interface UserLoginRequest {
	username: string;
	password: string;
}

export interface AdminLoginRequest {
	password: string;
}

export interface AuthResponse {
	access_token?: string;
	token_type?: string;
	[key: string]: unknown;
}

export interface PlayerConfig {
	name: string;
	userId: number;
	isLeader?: boolean;
	voteWeight?: number;
}

export interface TeamRole {
	type: string;
	allowed_action_types: string[];
	description?: string;
}

export interface TeamSpecialization {
	probability_modifier: number;
	cost_modifier: number;
	description?: string;
}

export interface TeamConfig {
	name: string;
	display_name: string;
	color: string;
	icon?: string;
	starting_credits: number;
	role: TeamRole;
	specializations?: Record<string, TeamSpecialization>;
	players: PlayerConfig[];
}

export interface MitreTechnique {
	id: string;
	name: string;
	url?: string;
}

export interface MitreMapping {
	techniques?: MitreTechnique[];
	tactics?: string[];
}

export interface ActionBaseStats {
	cost: number;
	success_probability: number;
	points_on_success: number;
	cooldown_turns: number;
}

export interface ActionChainStep {
	action_code: string;
	must_succeed: boolean;
}

export interface ActionPrerequisite {
	type: string;
	chain?: ActionChainStep[];
	[key: string]: unknown;
}

export interface AlternativeUnlock {
	type: string;
	item_code: string;
}

export interface ActionRequirements {
	unlocked_by_default: boolean;
	prerequisites?: ActionPrerequisite[];
	alternative_unlock?: AlternativeUnlock;
	min_credits: number;
	allowed_team_roles: string[];
}

export interface ActionEffect {
	type: string;
	target?: string;
	value?: number;
	buff_code?: string;
	duration?: number;
	[key: string]: unknown;
}

export interface ActionEffects {
	on_success?: ActionEffect[];
	on_failure?: ActionEffect[];
}

export interface ActionVisual {
	icon?: string;
	color?: string;
	animation?: string;
}

export interface ActionConfig {
	code: string;
	name: string;
	type: string;
	description?: string;
	mitre_mapping?: MitreMapping;
	base_stats: ActionBaseStats;
	requirements: ActionRequirements;
	effects?: ActionEffects;
	visual?: ActionVisual;
}

export interface ActionCounterConfig {
	defense_code: string;
	effectiveness: number;
	description?: string;
}

export interface AttackCounterMap {
	attack_code: string;
	countered_by: ActionCounterConfig[];
}

export interface BlackMarketTarget {
	action_code?: string | null;
	action_type?: string | null;
}

export interface BlackMarketEffect {
	modifier_type: string;
	value: number;
	description?: string;
}

export interface BlackMarketAvailability {
	unlocked_by_default: boolean;
	stock_limit?: number | null;
	per_team_limit?: number | null;
	available_from_turn: number;
}

export interface BlackMarketVisual {
	icon?: string;
	color?: string;
}

export interface BlackMarketItemConfig {
	code: string;
	name: string;
	description?: string;
	item_type: string;
	effect_type: string;
	target: BlackMarketTarget;
	effect: BlackMarketEffect;
	cost: number;
	duration_turns?: number | null;
	stackable?: boolean;
	availability?: BlackMarketAvailability;
	visual?: BlackMarketVisual;
}

export interface VotingConfig {
	voting_enabled?: boolean;
	required_approval?: string;
	leader_veto_enabled?: boolean;
	vote_time_limit_seconds?: number;
}

export interface VictoryConditions {
	type: string;
	points_to_win: number;
	max_turns: number;
	alternative_win_conditions?: string[];
}

export interface GameConfig {
	num_turns: number;
	turn_duration_seconds: number;
	selection_phase_duration: number;
	voting_phase_duration: number;
	point_threshold: number;
	voting_config?: VotingConfig;
	victory_conditions?: VictoryConditions;
}

export interface ConfigureAllRequest {
	version: string;
	game_config: GameConfig;
	teams: TeamConfig[];
	actions: ActionConfig[];
	action_counters: AttackCounterMap[];
	black_market: BlackMarketItemConfig[];
}

export interface GameEventConfig {
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
}

export interface ConfigureEventsRequest {
	events: GameEventConfig[];
}

export interface DirectiveConfig {
	name?: string;
	[key: string]: JsonValue | undefined;
}

export interface ConfigureDirectivesRequest {
	directives: DirectiveConfig[];
}

export interface ListUsersQuery {
	skip?: number;
	limit?: number;
}

export interface GameIdPath {
	gameId: string;
}

export interface EventStreamQuery {
	since?: number;
}

export interface CurrentEventsResponse {
	[key: string]: unknown;
}

export interface UsersResponse {
	items?: unknown[];
	users?: unknown[];
	total?: number;
	[key: string]: unknown;
}

export interface GenericResponse {
	[key: string]: unknown;
}
