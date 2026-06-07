export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
	[key: string]: JsonValue;
}

export interface ClientApiEnvelope<TData> {
	success: boolean;
	data: TData;
	timestamp: number;
	schemaVersion?: number;
	error?: Record<string, unknown> | null;
	[key: string]: unknown;
}

export interface GameInfo {
	id: number;
	gameId: string;
	phase: string;
	status: string;
	currentTurn: number;
	totalTurns: number;
	pointThreshold: number;
	winnerSideId?: number | null;
	currentPhase?: string | null;
	turnStatus?: string | null;
	phaseStatus?: string | null;
	serverTime: number;
	[key: string]: unknown;
}

export interface ClientContext {
	currentUserId: number;
	currentTeamId: number;
	currentSideId: number;
	[key: string]: unknown;
}

export interface SideSchema {
	id: number;
	name: string;
	totalCredits?: number;
	teamIds?: number[];
	[key: string]: unknown;
}

export interface ActiveEffectSchema {
	itemId: number;
	itemName?: string | null;
	effectType: string;
	targetActionId?: number | null;
	turnsRemaining: number;
	modifierValue: number;
	[key: string]: unknown;
}

export interface TeamSchema {
	id: number;
	name: string;
	sideId: number;
	role?: string | null;
	points?: number;
	credits?: number;
	actionsDisabledUntilTurn?: number | null;
	actionsDisabledReason?: string | null;
	vulnerabilities?: Record<string, string[]>;
	activeEffects?: ActiveEffectSchema[];
	[key: string]: unknown;
}

export interface PlayerSchema {
	id: number;
	name: string;
	teamId: number;
	isLeader?: boolean;
	voteWeight?: number;
	connected?: boolean;
	[key: string]: unknown;
}

export interface ActionSchema {
	id: number;
	category: string;
	name: string;
	displayName?: string | null;
	cost: number;
	probability: number;
	counterActionId?: number | null;
	allowedTeamIds?: number[] | null;
	interventionType?: string | null;
	sideId?: number | null;
	teamId?: number | null;
	[key: string]: unknown;
}

export interface BlackMarketItemSchema {
	id: number;
	name: string;
	cost: number;
	itemType: string;
	effectType: string;
	targetActionId?: number | null;
	value: number;
	duration?: number;
	[key: string]: unknown;
}

export interface EventSchema {
	id: number;
	name: string;
	effectType: string;
	targetActionId?: number | null;
	value: number;
	startTurn: number;
	duration: number;
	modifierType: string;
	affectedSideIds?: number[];
	isActive?: boolean;
	turnsRemaining?: number | null;
	limitType?: string | null;
	limitValue?: number | null;
	[key: string]: unknown;
}

export interface EntityLookupMap {
	teams: Record<string, TeamSchema>;
	actions: Record<string, ActionSchema>;
	players: Record<string, PlayerSchema>;
	sides: Record<string, SideSchema>;
	blackMarketItems: Record<string, BlackMarketItemSchema>;
	events: Record<string, EventSchema>;
	[key: string]: unknown;
}

export interface GameStateData {
	game: GameInfo;
	clientContext?: ClientContext | null;
	sides: SideSchema[];
	teams: TeamSchema[];
	players: PlayerSchema[];
	actions: ActionSchema[];
	blackMarketItems: BlackMarketItemSchema[];
	events: EventSchema[];
	byId?: EntityLookupMap | null;
	[key: string]: unknown;
}

export interface ClientActionOption {
	id: number;
	category: string;
	name: string;
	displayName: string;
	cost: number;
	probability: number;
	counterActionId?: number | null;
	counterActionName?: string | null;
	[key: string]: unknown;
}

export interface ClientActionsData {
	actions: ClientActionOption[];
	playerId: number;
	teamId: number;
	[key: string]: unknown;
}

export interface TargetTeamOption {
	id: number;
	name: string;
	sideId: number;
	sideName?: string | null;
	points: number;
	credits: number;
	[key: string]: unknown;
}

export interface ClientTargetsData {
	targets: TargetTeamOption[];
	playerId: number;
	teamId: number;
	[key: string]: unknown;
}

export interface ClientVoteActionRequest {
	action_id?: number | null;
	target_team_id?: number | null;
	black_market_item_id?: number | null;
	selection_only?: boolean | null;
}

export interface VoteSubmissionData {
	message: string;
	playerId: number;
	actionId?: number | null;
	targetTeamId?: number | null;
	blackMarketItemId?: number | null;
	selectionOnly?: boolean | null;
	[key: string]: unknown;
}

export type GameStateResponse = ClientApiEnvelope<GameStateData>;
export type AvailableActionsResponse = ClientApiEnvelope<ClientActionsData>;
export type AvailableTargetsResponse = ClientApiEnvelope<ClientTargetsData>;
export type ClientVoteActionResponse = ClientApiEnvelope<VoteSubmissionData>;

export interface HealthResponse {
	status: string;
	[key: string]: unknown;
}
