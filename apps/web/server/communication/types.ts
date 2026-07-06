import type {
	CommunicationAudience,
	CommunicationMessage,
	CommunicationMessageType,
	GamePhase,
	TeamRoleType,
} from "@workspace/trpc";

export interface CommunicationActorTeam {
	id: number;
	sideId: number;
	role: TeamRoleType;
}

export interface CommunicationActor {
	userId: number;
	teamId: number | null;
	sideId: number | null;
	role: TeamRoleType | "ADMIN";
	gameId: string | null;
	turn: number | null;
	phase: GamePhase | null;
	teams: CommunicationActorTeam[];
	permissions: {
		allowPublicAnnouncements: boolean;
		allowPlayerEnemyMessaging: boolean;
	};
}

export interface CreateCommunicationMessageInput {
	gameId: string;
	roomId?: string;
	type: CommunicationMessageType;
	audience: CommunicationAudience;
	body: string;
	body_fa?: string | null;
	related_subject_id?: string | null;
	related_sub_subject_id?: string | null;
	related_scenario_id?: string | null;
	related_step_id?: string | null;
	related_event_seq?: number | null;
}

export interface ListCommunicationMessagesInput {
	gameId: string;
	roomId?: string;
	since?: string;
	limit: number;
}

export interface CommunicationRepositoryQuery
	extends ListCommunicationMessagesInput {
	viewer: CommunicationActor;
}

export interface CommunicationRepository {
	create(message: CommunicationMessage): Promise<CommunicationMessage>;
	listVisible(
		query: CommunicationRepositoryQuery,
	): Promise<CommunicationMessage[]>;
}

export class CommunicationHttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "CommunicationHttpError";
	}
}
