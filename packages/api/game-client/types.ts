export type Primitive = string | number | boolean | null;

export interface WaitForPhaseRequest {
	phase?: string | null;
	timeout_sec?: number;
	poll_ms?: number;
	stop_on_finish?: boolean;
}

export interface WaitForPhaseResponse {
	finished: boolean;
	timeout: boolean;
	phase: string;
	player_code: string | null;
}

export interface ClientVoteActionRequest {
	action_id: number;
	target_team_id?: number | null;
	black_market_item_id?: number | null;
	selection_only?: boolean;
}

export interface ClientVoteActionResponse {
	success?: boolean;
	vote_id?: string | number | null;
	message?: string | null;
	[key: string]: unknown;
}

export interface GameStateResponse {
	[key: string]: unknown;
}

export interface AvailableAction {
	code?: string;
	name?: string;
	cost?: number;
	[key: string]: unknown;
}

export interface AvailableActionsResponse {
	actions?: AvailableAction[];
	black_market?: AvailableAction[];
	[key: string]: unknown;
}

export interface AvailableTargetsResponse {
	teams?: string[];
	players?: string[];
	structures?: string[];
	regions?: string[];
	[key: string]: unknown;
}

export interface ConnectResponse {
	connected: boolean;
	player_name?: string | null;
	team?: string | null;
	[key: string]: unknown;
}

export interface HealthResponse {
	status?: string;
	[key: string]: unknown;
}
