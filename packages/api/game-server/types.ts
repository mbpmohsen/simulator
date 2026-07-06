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
	name?: string;
	name_fa?: string;
	isLeader?: boolean;
	voteWeight?: number;
	[key: string]: unknown;
}

export type PlayerConfig = TeamPlayerRequest;

export type TeamRoleType = "ATTACKER" | "DEFENCER" | "BOTH" | "GOVERNMENT";
export type AllowedActionType = "attack" | "defense" | "government";

export interface TeamRoleRequest {
	type: string;
	allowed_action_types?: string[];
	type_fa?: string;
	allowed_action_types_fa?: string[];
	description?: string;
	[key: string]: unknown;
}

export type TeamRole = Omit<
	TeamRoleRequest,
	"type" | "allowed_action_types"
> & {
	type: TeamRoleType;
	allowed_action_types?: AllowedActionType[];
};

export interface TeamRequest {
	id?: number;
	name: string;
	side_id?: number;
	side_name?: string | null;
	display_name?: string | null;
	display_name_fa?: string | null;
	name_fa?: string | null;
	side_name_fa?: string | null;
	team_type?: "PLAYER" | "GOVERNMENT";
	team_type_fa?: string;
	governmentCode?: string;
	color?: string | null;
	icon?: string | null;
	starting_credits?: number;
	role: TeamRoleRequest | string;
	specializations?: Record<string, unknown>;
	players: TeamPlayerRequest[];
	[key: string]: unknown;
}

export type TeamConfig = TeamRequest;
export type Team = TeamRequest;

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

export type ActionType = "attack" | "defense";

export interface ActionConfigRequest {
	code: string;
	name?: string | null;
	name_fa?: string | null;
	type: ActionType;
	type_fa?: string;
	description?: string | null;
	description_fa?: string | null;
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
	effectiveness: number;
	description?: string;
	[key: string]: unknown;
}

export interface ActionCounterRequest {
	attack_code: string;
	countered_by?: CounterActionMapping[];
	[key: string]: unknown;
}

export type AttackCounterMap = ActionCounterRequest;
export type ActionCounter = ActionCounterRequest;

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
	actions?: GovernmentActionRequest[];
	[key: string]: unknown;
}

export type GovernmentConfig = GovernmentConfigRequest;
export type GovernmentAction = GovernmentActionRequest;

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
	name_fa?: string | null;
	description?: string;
	description_fa?: string;
	item_type: string;
	item_type_fa?: string;
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
export type BlackMarketItem = BlackMarketItemRequest;

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

export type SubjectType =
	| "mitre_technique"
	| "asset"
	| "critical_infrastructure";
export type ScenarioType = "attack_path" | "defense_path";
export type ExecutionMode = "ordered" | "checklist" | "branching";
export type StepStatus = "available" | "completed" | "failed" | "locked";
export type SubjectStatus = "active" | "stalled" | "completed";
export type GamePhase =
	| "GOVERNMENT_SELECTION"
	| "SELECTION"
	| "VOTING"
	| "CALCULATION";
export type ImpactEffectType =
	| "ADVANCE_PROGRESS"
	| "STALL_SUBJECT"
	| "RESUME_SUBJECT"
	| "DISABLE_ACTION"
	| "ENABLE_ACTION"
	| "LOCK_SCENARIO"
	| "UNLOCK_SCENARIO"
	| "SKIP_STEP"
	| "CREDIT_DELTA"
	| "POINT_DELTA"
	| "REVEAL_TO_GOVERNMENT"
	| "REDUCE_VISIBILITY"
	| "PROBABILITY_MODIFIER"
	| "REMOVE_ACTIVE_EFFECT";
export type GovernmentOrderType =
	| "ASSIGN_SUBJECT"
	| "FORCE_SUBJECT"
	| "ALLOCATE_CREDIT"
	| "BAN_ACTION"
	| "UNBAN_ACTION"
	| "DISABLE_TEAM"
	| "ENABLE_TEAM";

export interface Goal {
	id: string;
	title: string;
	title_fa?: string;
	description?: string | null;
	description_fa?: string | null;
	side_id: number;
}

export interface Subject {
	id: string;
	goal_id: string;
	title: string;
	title_fa?: string;
	description?: string | null;
	description_fa?: string | null;
	subject_type: SubjectType;
	subject_type_fa?: string;
	target_team_id: number;
	owner_side_id: number;
	criticality?: number | null;
	mitre_mapping?: Record<string, unknown>;
}

export interface SubSubject {
	id: string;
	subject_id: string;
	title: string;
	title_fa?: string;
	progress_share: number;
	source?: Record<string, unknown>;
	completion_rule?: Record<string, unknown>;
}

export interface Scenario {
	id: string;
	sub_subject_id: string;
	title: string;
	title_fa?: string;
	scenario_type: ScenarioType;
	scenario_type_fa?: string;
	execution_mode: ExecutionMode;
	execution_mode_fa?: string;
	allowed_team_roles?: Exclude<TeamRoleType, "GOVERNMENT">[];
	allowed_team_roles_fa?: string[];
	base_reward_points?: number | null;
	base_credit_cost?: number | null;
	risk_level?: string | null;
	risk_level_fa?: string | null;
}

export interface ImpactEffect {
	type: ImpactEffectType;
	target?: string | null;
	value?: number | null;
	duration_turns?: number | null;
	confidence?: "low" | "medium" | "high" | null;
	reason?: string | null;
}

export interface ScenarioStep {
	id: string;
	scenario_id: string;
	order?: number | null;
	action_code: string;
	required?: boolean;
	depends_on?: string[];
	on_success?: ImpactEffect[];
	on_failure?: ImpactEffect[];
}

export interface GovernmentCatalogGoal {
	id: string;
	title: string;
	title_fa?: string | null;
	description?: string | null;
	description_fa?: string | null;
	side_id?: number;
}

export interface GovernmentCatalogStep {
	id: string;
	scenario_id: string;
	order?: number | null;
	action_code: string;
	required: boolean;
}

export interface GovernmentCatalogScenario {
	id: string;
	sub_subject_id: string;
	title: string;
	title_fa?: string | null;
	scenario_type: ScenarioType;
	execution_mode: ExecutionMode;
	allowed_team_roles?: Exclude<TeamRoleType, "GOVERNMENT">[];
	steps: GovernmentCatalogStep[];
}

export interface GovernmentCatalogSubSubject {
	id: string;
	subject_id: string;
	title: string;
	title_fa?: string | null;
	progress_share: number;
	scenarios: GovernmentCatalogScenario[];
}

export interface GovernmentCatalogSubject {
	id: string;
	goal_id: string;
	title: string;
	title_fa?: string | null;
	description?: string | null;
	description_fa?: string | null;
	subject_type: SubjectType;
	target_team_id: number;
	owner_side_id: number;
	criticality?: number | null;
	sub_subjects: GovernmentCatalogSubSubject[];
}

export interface GovernmentCatalogTeam {
	id: number;
	name: string;
	name_fa?: string | null;
	display_name?: string | null;
	display_name_fa?: string | null;
	side_id: number;
	role?: { type: TeamRoleType };
}

export interface GovernmentCatalogAction {
	code: string;
	name: string;
	name_fa?: string | null;
	description?: string | null;
	description_fa?: string | null;
	type: ActionType;
}

export interface GovernmentCatalogResponse {
	side_id: number;
	government_team_id?: number;
	goals: GovernmentCatalogGoal[];
	subjects: GovernmentCatalogSubject[];
	teams: GovernmentCatalogTeam[];
	bannable_actions: GovernmentCatalogAction[];
}

export interface ImpactRule {
	id: string;
	trigger: {
		event: string;
		action_code?: string;
	};
	effects: ImpactEffect[];
}

export type VisibilityAudienceType = "user" | "team" | "side" | "role";

export interface VisibilityAudience {
	type: VisibilityAudienceType;
	id?: number;
	user_id?: number;
	team_id?: number;
	side_id?: number;
	role_value?: TeamRoleType | "ADMIN";
}

export interface CrossSideVisibilityGrantee extends VisibilityAudience {
	actor_side_id: number;
	target_side_id?: number;
}

export interface VisibilityConfig {
	events: Record<string, { audiences: VisibilityAudience[] }>;
	cross_side_result: {
		enabled: boolean;
		grantees: CrossSideVisibilityGrantee[];
	};
}

export interface ConfigureAllRequestV2 {
	version: "2.0";
	game_config: GameConfigRequest;
	teams: TeamRequest[];
	actions: ActionConfigRequest[];
	government?: GovernmentConfigRequest | null;
	action_counters?: ActionCounterRequest[];
	black_market?: BlackMarketItemRequest[];
	max_players?: number | null;
	sides?: SideConfig[] | null;
	goals: Goal[];
	subjects: Subject[];
	sub_subjects: SubSubject[];
	scenarios: Scenario[];
	scenario_steps: ScenarioStep[];
	impact_rules: ImpactRule[];
	visibility_config: VisibilityConfig;
}

export interface SubjectSubSubjectView {
	id: string;
	title: string;
	title_fa?: string;
	progress_share: number;
	completed: boolean;
	stalled?: boolean;
}

export interface SubjectView {
	id: string;
	title: string;
	title_fa?: string;
	subject_type: SubjectType;
	progress_percent: number;
	status?: SubjectStatus;
	sub_subjects: SubjectSubSubjectView[];
}

export interface ScenarioView {
	id: string;
	title: string;
	title_fa?: string;
	scenario_type: ScenarioType;
	execution_mode: ExecutionMode;
}

export interface StepView {
	id: string;
	action_code: string;
	action_name?: string;
	action_name_fa?: string;
	order: number | null;
	required: boolean;
	status: StepStatus;
	available: boolean;
	cost?: number;
	probability?: number;
}

export interface LockReason {
	code: string;
	message: string;
	source: string | null;
}

export interface LockReasonsResponse {
	node_id: string;
	locked: boolean;
	reasons: LockReason[];
}

export interface OrderView {
	turn: number;
	government_team_id: number;
	target_team_id: number;
	order_type: GovernmentOrderType;
	payload: Record<string, unknown>;
	forced: boolean;
}

export interface PlayerStateResponse {
	team_id: number;
	current_turn: number;
	current_phase?: GamePhase;
	credits: number;
	active_subject_id: string | null;
	active_sub_subject_id: string | null;
	active_scenario_id: string | null;
	assigned_subjects: SubjectView[];
	orders?: OrderView[];
}

export interface GovernmentTeamProgress {
	team_id: number;
	credits?: number;
	assigned_subjects: Array<
		Pick<
			SubjectView,
			"id" | "title" | "title_fa" | "progress_percent" | "status"
		> & {
			sub_subjects?: SubjectSubSubjectView[];
		}
	>;
}

export interface GovernmentOverviewResponse {
	side_id: number;
	goal_id: string | null;
	teams: GovernmentTeamProgress[];
	orders?: OrderView[];
}

export type GovernmentOrder =
	| {
			order_type: "ASSIGN_SUBJECT" | "FORCE_SUBJECT";
			target_team_id: number;
			payload: { subject_id: string };
	  }
	| {
			order_type: "ALLOCATE_CREDIT";
			target_team_id: number;
			payload: { amount: number };
	  }
	| {
			order_type: "BAN_ACTION";
			target_team_id: number;
			payload: { action_code: string; duration?: number };
	  }
	| {
			order_type: "UNBAN_ACTION";
			target_team_id: number;
			payload: { action_code: string };
	  }
	| {
			order_type: "DISABLE_TEAM";
			target_team_id: number;
			payload: { duration?: number; reason?: string };
	  }
	| {
			order_type: "ENABLE_TEAM";
			target_team_id: number;
			payload: Record<string, never>;
	  };

export interface GamePlanValidationError {
	loc: string;
	code: string;
	message: string;
}

export interface GamePlanValidationResponse {
	valid: boolean;
	errors: GamePlanValidationError[];
}

export interface SubjectStateResponse {
	subject_id: string;
	teams: Array<{
		team_id: number;
		progress_percent: number;
		status: SubjectStatus;
		sub_subjects: Array<
			Pick<
				SubjectSubSubjectView,
				"id" | "progress_share" | "completed" | "stalled"
			>
		>;
	}>;
}

export interface GamePlanGraphResponse {
	nodes: Array<Record<string, unknown>>;
	edges: Array<Record<string, unknown>>;
}

export interface SelectScenarioResponse {
	ok: true;
	active_subject_id: string;
	active_sub_subject_id: string;
	active_scenario_id: string;
	target_team_id: number | null;
}

export interface VoteStepResponse {
	ok: true;
	scenario_id: string;
	step_id: string;
	action_code: string;
	category: ActionType;
}

export interface GoalSelectResponse {
	ok: true;
	side_id: number;
	goal_id: string;
}

export interface GovernmentOrderResultResponse {
	ok: true;
	order_type: GovernmentOrderType;
	target_team_id: number;
	subject_id?: string;
	forced?: boolean;
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

export interface AdminGameCatalogEntry {
	gameId: string;
	status?: string | null;
	phase?: string | null;
	currentTurn?: number | null;
	totalTurns?: number | null;
	pointThreshold?: number | null;
	currentPhase?: string | null;
	createdAt?: string | null;
	governmentEnabled?: boolean | null;
	sides?: string[];
	turnAnalyticsCount?: number;
	lastAnalyticsTurn?: number | null;
	plotCount?: number;
	hasStoredAnalytics?: boolean;
	hasStoredPlots?: boolean;
	isActive?: boolean;
	[key: string]: unknown;
}

export interface AdminGameCatalogData {
	activeGameId?: string | null;
	games: AdminGameCatalogEntry[];
	count: number;
	[key: string]: unknown;
}

export type AdminGameCatalogResponse = ServerApiEnvelope<AdminGameCatalogData>;

export interface TurnAnalyticsListQuery {
	since_turn?: number;
	limit?: number;
}

export interface TurnAnalyticsSummary {
	turn: number;
	createdAt?: number | string | null;
	actionCount?: number;
	comparisonCount?: number;
	teamCount?: number;
	plotCount?: number;
	bestTargets?: Record<string, string>;
	[key: string]: unknown;
}

export interface TurnAnalyticsListData {
	gameId: string;
	reports: TurnAnalyticsSummary[];
	count: number;
	[key: string]: unknown;
}

export type TurnAnalyticsListResponse =
	ServerApiEnvelope<TurnAnalyticsListData>;

export interface TurnAnalyticsPlotStorage {
	provider?: string | null;
	bucket?: string | null;
	region?: string | null;
	endpointUrl?: string | null;
	objectKey?: string | null;
	contentType?: string | null;
	accessMethod?: string | null;
	[key: string]: unknown;
}

export interface TurnAnalyticsPlot {
	teamName?: string | null;
	targetTeamName?: string | null;
	fileName?: string | null;
	storage?: TurnAnalyticsPlotStorage | null;
	accessUrl?: string | null;
	accessUrlExpiresAt?: number | null;
	[key: string]: unknown;
}

export type TurnAnalyticsPlotResponse = Blob;

export interface TurnAnalyticsDetailData {
	gameId: string;
	turn: number;
	createdAt?: number | string | null;
	mathematics?: Record<string, unknown>;
	flow?: {
		actions?: Record<string, unknown>[];
		[key: string]: unknown;
	};
	comparison?: Record<string, unknown>[];
	plots?: TurnAnalyticsPlot[];
	turnState?: Record<string, unknown>;
	[key: string]: unknown;
}

export type TurnAnalyticsDetailResponse =
	ServerApiEnvelope<TurnAnalyticsDetailData>;

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

export interface BaseGameEvent {
	seq: number;
	gameId: string;
	type: string;
	phase?: string | null;
	visibility: EventVisibility;
	payload: Record<string, unknown>;
	createdAt: string;
	schemaVersion?: number;
}

export interface ScenarioStepResolvedPayload {
	subject_id: string;
	sub_subject_id: string;
	scenario_id: string;
	step_id: string;
	action_code: string;
	result: "success" | "failed";
	team_id: number;
	target_team_id: number | null;
	effects: Array<
		ImpactEffect | { type: "SUBJECT_PROGRESS"; target: string; value: number }
	>;
	message: string;
	actor_side: number;
	target_side: number;
}

export interface GovernmentOrderIssuedPayload {
	order_type: GovernmentOrderType;
	government_team_id: number;
	target_team_id: number;
	subject_id: string | null;
	forced: boolean | null;
	message: string;
}

export interface TurnAnalyticsRecordedPayload {
	turn: number;
	report: TurnAnalyticsDetailData;
	message?: string;
}

export interface ScenarioStepResolvedEvent
	extends Omit<BaseGameEvent, "type" | "payload"> {
	type: "SCENARIO_STEP_RESOLVED";
	payload: ScenarioStepResolvedPayload;
}

export interface GovernmentOrderIssuedEvent
	extends Omit<BaseGameEvent, "type" | "payload"> {
	type: "GOVERNMENT_ORDER_ISSUED";
	payload: GovernmentOrderIssuedPayload;
}

export interface TurnAnalyticsRecordedEvent
	extends Omit<BaseGameEvent, "type" | "payload"> {
	type: "TURN_ANALYTICS_RECORDED";
	payload: TurnAnalyticsRecordedPayload;
}

export type GameEvent =
	| ScenarioStepResolvedEvent
	| GovernmentOrderIssuedEvent
	| TurnAnalyticsRecordedEvent
	| BaseGameEvent;

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

export type DirectivesConfiguredResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type DirectivesAddedResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type DirectiveDeletedResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type DirectiveMessageResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type DirectivesListResponse = ServerApiEnvelope<Record<string, unknown>>;
export type ActiveDirectivesResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type AdminEventListResponse = ServerApiEnvelope<Record<string, unknown>>;
export type AdminClearEventsResponse = ServerApiEnvelope<
	Record<string, unknown>
>;
export type AdminGameStateResponse = ServerApiEnvelope<Record<string, unknown>>;

export interface ServerHealthResponse {
	status: string;
	[key: string]: unknown;
}

export interface GenericResponse {
	[key: string]: unknown;
}
