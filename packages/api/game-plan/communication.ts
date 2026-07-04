import type { GamePhase, TeamRoleType } from "../game-server/types";

export type CommunicationMessageType =
	| "TEAM_CHAT"
	| "GOVERNMENT_TO_OWN_TEAM"
	| "GOVERNMENT_TO_ALLIED_SIDE"
	| "GOVERNMENT_TO_ENEMY_GOVERNMENT"
	| "GOVERNMENT_TO_ENEMY_TEAM"
	| "PUBLIC_ANNOUNCEMENT"
	| "FAKE_NEWS_SIMULATION"
	| "THREAT_SIMULATION"
	| "COACH_ADVICE"
	| "SYSTEM_EVENT_REFERENCE";

export type CommunicationAudienceType =
	| "team"
	| "side"
	| "government"
	| "all"
	| "admin";

export interface CommunicationMessage {
	id: string;
	game_id: string;
	turn: number;
	phase?: GamePhase;
	type: CommunicationMessageType;
	sender_user_id: number;
	sender_team_id: number;
	sender_role: TeamRoleType | "ADMIN";
	audience: { type: CommunicationAudienceType; id?: number };
	body: string;
	body_fa?: string;
	simulation_label?: boolean;
	related_subject_id?: string;
	related_sub_subject_id?: string;
	related_scenario_id?: string;
	related_step_id?: string;
	related_event_seq?: number;
	created_at: string;
	status: "sent" | "delivered" | "failed" | "hidden";
}

export interface CommunicationSendInput {
	gameId: string;
	type: CommunicationMessageType;
	audience: CommunicationMessage["audience"];
	body: string;
	related_subject_id?: string;
	related_sub_subject_id?: string;
	related_scenario_id?: string;
	related_step_id?: string;
	related_event_seq?: number;
}

export interface CommunicationService {
	readonly mode: "real" | "mock";
	listMessages(params: {
		gameId: string;
		roomId?: string;
		since?: string;
		limit?: number;
	}): Promise<CommunicationMessage[]>;
	sendMessage(input: CommunicationSendInput): Promise<CommunicationMessage>;
	subscribeMessages(params: {
		gameId: string;
		roomId?: string;
		onMessage: (message: CommunicationMessage) => void;
	}): () => void;
}

const PLAYER_TYPES = new Set<CommunicationMessageType>(["TEAM_CHAT"]);
const GOVERNMENT_TYPES = new Set<CommunicationMessageType>([
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
	"PUBLIC_ANNOUNCEMENT",
	"FAKE_NEWS_SIMULATION",
	"THREAT_SIMULATION",
]);

export const canSendCommunication = (
	role: TeamRoleType | "ADMIN",
	type: CommunicationMessageType,
): boolean =>
	role === "ADMIN" ||
	(role === "GOVERNMENT" ? GOVERNMENT_TYPES.has(type) : PLAYER_TYPES.has(type));
