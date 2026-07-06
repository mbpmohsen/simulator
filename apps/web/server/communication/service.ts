import { randomUUID } from "node:crypto";
import type {
	CommunicationAudience,
	CommunicationMessage,
} from "@workspace/trpc";
import {
	parseCommunicationMessageInput,
	validateCommunicationPermission,
} from "./policy";
import type {
	CommunicationActor,
	CommunicationRepository,
	CreateCommunicationMessageInput,
	ListCommunicationMessagesInput,
} from "./types";
import { CommunicationHttpError } from "./types";

const normalizeAudience = (
	audience: CommunicationAudience,
): CommunicationAudience => {
	if (audience.type === "all" || audience.type === "admin") {
		return { type: audience.type };
	}
	if (audience.id === null || audience.id === undefined) {
		return { type: audience.type };
	}
	return { type: audience.type, id: Number(audience.id) };
};

const assertGameAccess = (actor: CommunicationActor, gameId: string): void => {
	if (actor.role !== "ADMIN" && actor.gameId !== gameId) {
		throw new CommunicationHttpError(
			403,
			"GAME_ACCESS_FORBIDDEN",
			"کاربر به پیام‌های این بازی دسترسی ندارد.",
		);
	}
};

export class CommunicationMessageService {
	constructor(private readonly repository: CommunicationRepository) {}

	async create(
		actor: CommunicationActor,
		rawInput: unknown,
	): Promise<CommunicationMessage> {
		const input = parseCommunicationMessageInput(rawInput);
		assertGameAccess(actor, input.gameId);
		validateCommunicationPermission(actor, input);
		const message: CommunicationMessage = {
			id: randomUUID(),
			game_id: input.gameId,
			room_id: input.roomId,
			turn: actor.turn,
			phase: actor.phase,
			type: input.type,
			sender_user_id: actor.userId,
			sender_team_id: actor.teamId,
			sender_side_id: actor.sideId,
			sender_role: actor.role,
			audience: normalizeAudience(input.audience),
			body: input.body.trim(),
			body_fa: input.body_fa?.trim() || null,
			simulation_label:
				input.type === "FAKE_NEWS_SIMULATION" ||
				input.type === "THREAT_SIMULATION",
			related_subject_id: input.related_subject_id ?? null,
			related_sub_subject_id: input.related_sub_subject_id ?? null,
			related_scenario_id: input.related_scenario_id ?? null,
			related_step_id: input.related_step_id ?? null,
			related_event_seq: input.related_event_seq ?? null,
			status: "delivered",
			created_at: new Date().toISOString(),
		};
		return this.repository.create(message);
	}

	async list(
		actor: CommunicationActor,
		input: ListCommunicationMessagesInput,
	): Promise<CommunicationMessage[]> {
		assertGameAccess(actor, input.gameId);
		return this.repository.listVisible({ ...input, viewer: actor });
	}
}

export type { CreateCommunicationMessageInput };
