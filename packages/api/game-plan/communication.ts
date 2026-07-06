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

export interface CommunicationAudience {
	type: CommunicationAudienceType;
	id?: number | string | null;
}

export interface CommunicationMessage {
	id: string;
	game_id: string;
	room_id?: string;
	turn?: number | null;
	phase?: GamePhase | null;
	type: CommunicationMessageType;
	sender_user_id: number;
	sender_team_id?: number | null;
	sender_side_id?: number | null;
	sender_role: TeamRoleType | "ADMIN";
	audience: CommunicationAudience;
	body: string;
	body_fa?: string | null;
	simulation_label?: boolean;
	related_subject_id?: string | null;
	related_sub_subject_id?: string | null;
	related_scenario_id?: string | null;
	related_step_id?: string | null;
	related_event_seq?: number | null;
	created_at: string;
	status: "sent" | "delivered" | "failed" | "hidden";
}

export interface CommunicationRoom {
	id: string;
	title: string;
	title_fa?: string;
	audience: CommunicationAudience;
	message_types: CommunicationMessageType[];
	read_only?: boolean;
}

export interface CommunicationSendInput {
	gameId: string;
	roomId?: string;
	type: CommunicationMessageType;
	audience: CommunicationAudience;
	body: string;
	related_subject_id?: string;
	related_sub_subject_id?: string;
	related_scenario_id?: string;
	related_step_id?: string;
	related_event_seq?: number;
}

export interface CommunicationViewer {
	userId: number;
	teamId?: number | null;
	sideId?: number | null;
	role: TeamRoleType | "ADMIN";
}

export interface CommunicationPermissionOptions {
	allowPublicAnnouncements?: boolean;
	allowPlayerEnemyMessaging?: boolean;
}

export interface CommunicationServiceCapabilities {
	realtime: boolean;
	hide: boolean;
	report: boolean;
	moderate: boolean;
	export: boolean;
}

export interface CommunicationService {
	readonly mode: "real" | "mock";
	readonly capabilities: CommunicationServiceCapabilities;
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
		onError?: (error: Error) => void;
	}): () => void;
	hideMessage?(messageId: string): Promise<void>;
	reportMessage?(messageId: string, reason?: string): Promise<void>;
}

const PLAYER_TYPES = new Set<CommunicationMessageType>(["TEAM_CHAT"]);
const GOVERNMENT_TYPES = new Set<CommunicationMessageType>([
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
	"FAKE_NEWS_SIMULATION",
	"THREAT_SIMULATION",
]);

export const isSimulationCommunication = (
	type: CommunicationMessageType,
): boolean => type === "FAKE_NEWS_SIMULATION" || type === "THREAT_SIMULATION";

export const canSendCommunication = (
	role: TeamRoleType | "ADMIN",
	type: CommunicationMessageType,
	permissions: CommunicationPermissionOptions = {},
): boolean => {
	if (role === "ADMIN") return true;
	if (role === "GOVERNMENT") {
		if (type === "PUBLIC_ANNOUNCEMENT") {
			return permissions.allowPublicAnnouncements === true;
		}
		return GOVERNMENT_TYPES.has(type);
	}
	if (
		permissions.allowPlayerEnemyMessaging &&
		type === "GOVERNMENT_TO_ENEMY_TEAM"
	) {
		return true;
	}
	return PLAYER_TYPES.has(type);
};

export const isCommunicationVisibleToViewer = (
	message: CommunicationMessage,
	viewer: CommunicationViewer,
): boolean => {
	if (viewer.role === "ADMIN" || message.sender_user_id === viewer.userId) {
		return true;
	}
	if (message.status === "hidden") return false;
	switch (message.audience.type) {
		case "all":
			return true;
		case "team":
			return (
				viewer.teamId !== null &&
				viewer.teamId !== undefined &&
				Number(message.audience.id ?? message.sender_team_id) === viewer.teamId
			);
		case "side":
			return (
				viewer.sideId !== null &&
				viewer.sideId !== undefined &&
				Number(message.audience.id ?? message.sender_side_id) === viewer.sideId
			);
		case "government":
			return (
				viewer.role === "GOVERNMENT" &&
				(message.audience.id === undefined ||
					message.audience.id === null ||
					Number(message.audience.id) === viewer.teamId)
			);
		case "admin":
			return false;
	}
};
