import type {
	CommunicationAudience,
	CommunicationMessageType,
} from "@workspace/trpc";
import { z } from "zod";
import type {
	CommunicationActor,
	CreateCommunicationMessageInput,
} from "./types";
import { CommunicationHttpError } from "./types";

const MESSAGE_TYPES = [
	"TEAM_CHAT",
	"GOVERNMENT_TO_OWN_TEAM",
	"GOVERNMENT_TO_ALLIED_SIDE",
	"GOVERNMENT_TO_ENEMY_GOVERNMENT",
	"GOVERNMENT_TO_ENEMY_TEAM",
	"PUBLIC_ANNOUNCEMENT",
	"FAKE_NEWS_SIMULATION",
	"THREAT_SIMULATION",
	"COACH_ADVICE",
	"SYSTEM_EVENT_REFERENCE",
] as const satisfies readonly CommunicationMessageType[];

const AUDIENCE_TYPES = ["team", "side", "government", "all", "admin"] as const;

const nullableTrimmedString = z.string().trim().max(250).nullable().optional();

const createMessageSchema = z.object({
	gameId: z.string().trim().min(1).max(100),
	roomId: z.string().trim().min(1).max(100).optional(),
	type: z.enum(MESSAGE_TYPES),
	audience: z.object({
		type: z.enum(AUDIENCE_TYPES),
		id: z
			.union([z.number().int(), z.string().trim().min(1), z.null()])
			.optional(),
	}),
	body: z.string().trim().min(1).max(1000),
	body_fa: z.string().trim().max(1000).nullable().optional(),
	related_subject_id: nullableTrimmedString,
	related_sub_subject_id: nullableTrimmedString,
	related_scenario_id: nullableTrimmedString,
	related_step_id: nullableTrimmedString,
	related_event_seq: z.number().int().positive().nullable().optional(),
});

const DISALLOWED_PERSONAL_ABUSE = [
	/می\s*کشمت/u,
	/پیدایت\s*می\s*کنم/u,
	/آدرس\s*(خانه|منزل)/u,
	/kill\s+you/iu,
	/find\s+you/iu,
	/home\s+address/iu,
];

const numericAudienceId = (
	audience: CommunicationAudience,
	message: string,
): number => {
	const id = Number(audience.id);
	if (!Number.isSafeInteger(id) || id <= 0) {
		throw new CommunicationHttpError(400, "INVALID_AUDIENCE", message);
	}
	return id;
};

const teamById = (actor: CommunicationActor, teamId: number) =>
	actor.teams.find((team) => team.id === teamId);

export const parseCommunicationMessageInput = (
	value: unknown,
): CreateCommunicationMessageInput => {
	const result = createMessageSchema.safeParse(value);
	if (!result.success) {
		const emptyBody = result.error.issues.some(
			(issue) => issue.path.join(".") === "body" && issue.code === "too_small",
		);
		throw new CommunicationHttpError(
			400,
			emptyBody ? "EMPTY_MESSAGE" : "INVALID_MESSAGE",
			emptyBody ? "متن پیام نمی‌تواند خالی باشد." : "ساختار پیام معتبر نیست.",
		);
	}
	return result.data;
};

export const validateCommunicationPermission = (
	actor: CommunicationActor,
	input: CreateCommunicationMessageInput,
): void => {
	if (
		input.audience.type === "team" ||
		input.audience.type === "side" ||
		(input.audience.type === "government" &&
			input.audience.id !== null &&
			input.audience.id !== undefined)
	) {
		numericAudienceId(input.audience, "شناسه مخاطب معتبر نیست.");
	}

	if (
		input.type === "FAKE_NEWS_SIMULATION" ||
		input.type === "THREAT_SIMULATION"
	) {
		if (DISALLOWED_PERSONAL_ABUSE.some((pattern) => pattern.test(input.body))) {
			throw new CommunicationHttpError(
				400,
				"UNSAFE_SIMULATION_MESSAGE",
				"پیام شبیه‌سازی نباید شامل تهدید یا آزار واقعی و شخصی باشد.",
			);
		}
	}

	if (actor.role === "ADMIN") return;
	if (!actor.teamId || !actor.sideId) {
		throw new CommunicationHttpError(
			403,
			"ACTOR_CONTEXT_MISSING",
			"تیم یا سمت فرستنده مشخص نیست.",
		);
	}

	if (actor.role !== "GOVERNMENT") {
		if (input.type === "TEAM_CHAT") {
			const targetTeamId = numericAudienceId(
				input.audience,
				"تیم مقصد معتبر نیست.",
			);
			if (input.audience.type !== "team" || targetTeamId !== actor.teamId) {
				throw new CommunicationHttpError(
					403,
					"PLAYER_TEAM_CHAT_FORBIDDEN",
					"بازیکن فقط می‌تواند برای تیم خود پیام بفرستد.",
				);
			}
			return;
		}
		if (
			actor.permissions.allowPlayerEnemyMessaging &&
			input.type === "GOVERNMENT_TO_ENEMY_TEAM"
		) {
			const target = teamById(
				actor,
				numericAudienceId(input.audience, "تیم مقصد معتبر نیست."),
			);
			if (input.audience.type === "team" && target?.sideId !== actor.sideId)
				return;
		}
		throw new CommunicationHttpError(
			403,
			"PLAYER_MESSAGE_FORBIDDEN",
			"این نوع پیام برای نقش بازیکن مجاز نیست.",
		);
	}

	switch (input.type) {
		case "GOVERNMENT_TO_OWN_TEAM": {
			const target = teamById(
				actor,
				numericAudienceId(input.audience, "تیم مقصد معتبر نیست."),
			);
			if (
				input.audience.type !== "team" ||
				!target ||
				target.sideId !== actor.sideId
			) {
				throw new CommunicationHttpError(
					403,
					"GOVERNMENT_TARGET_OFF_SIDE",
					"تیم مقصد باید در سمت خودی باشد.",
				);
			}
			return;
		}
		case "GOVERNMENT_TO_ALLIED_SIDE":
			if (
				input.audience.type !== "side" ||
				numericAudienceId(input.audience, "سمت مقصد معتبر نیست.") !==
					actor.sideId
			) {
				throw new CommunicationHttpError(
					403,
					"GOVERNMENT_SIDE_FORBIDDEN",
					"پیام سمت خودی فقط برای سمت فرستنده مجاز است.",
				);
			}
			return;
		case "GOVERNMENT_TO_ENEMY_GOVERNMENT": {
			const target = teamById(
				actor,
				numericAudienceId(input.audience, "دولت مقصد معتبر نیست."),
			);
			if (
				input.audience.type !== "government" ||
				!target ||
				target.role !== "GOVERNMENT" ||
				target.id === actor.teamId
			) {
				throw new CommunicationHttpError(
					403,
					"GOVERNMENT_TARGET_INVALID",
					"دولت مقصد معتبر نیست.",
				);
			}
			return;
		}
		case "GOVERNMENT_TO_ENEMY_TEAM": {
			const target = teamById(
				actor,
				numericAudienceId(input.audience, "تیم مقصد معتبر نیست."),
			);
			if (
				input.audience.type !== "team" ||
				!target ||
				target.sideId === actor.sideId ||
				target.role === "GOVERNMENT"
			) {
				throw new CommunicationHttpError(
					403,
					"ENEMY_TEAM_TARGET_INVALID",
					"تیم حریف مقصد معتبر نیست.",
				);
			}
			return;
		}
		case "PUBLIC_ANNOUNCEMENT":
			if (
				!actor.permissions.allowPublicAnnouncements ||
				input.audience.type !== "all"
			) {
				throw new CommunicationHttpError(
					403,
					"PUBLIC_ANNOUNCEMENT_FORBIDDEN",
					"انتشار اطلاعیه عمومی برای این دولت فعال نیست.",
				);
			}
			return;
		case "FAKE_NEWS_SIMULATION":
		case "THREAT_SIMULATION":
			if (input.audience.type !== "all") {
				throw new CommunicationHttpError(
					400,
					"SIMULATION_AUDIENCE_INVALID",
					"پیام شبیه‌سازی باید در کانال عمومی بازی منتشر شود.",
				);
			}
			return;
		case "TEAM_CHAT":
		case "COACH_ADVICE":
		case "SYSTEM_EVENT_REFERENCE":
			throw new CommunicationHttpError(
				403,
				"GOVERNMENT_MESSAGE_FORBIDDEN",
				"این نوع پیام برای دولت مجاز نیست.",
			);
	}
};
