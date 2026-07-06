import type { GamePhase, TeamRoleType } from "@workspace/trpc";
import { type CommunicationActor, CommunicationHttpError } from "./types";

const GAME_SERVER_URLS = [
	process.env.NEXT_PUBLIC_CLIENT_URL,
	process.env.GAME_API_URL,
	process.env.NEXT_PUBLIC_SERVER_URL,
].filter(
	(value, index, values): value is string =>
		Boolean(value) && values.indexOf(value) === index,
);

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const isRole = (value: unknown): value is TeamRoleType =>
	value === "ATTACKER" ||
	value === "DEFENCER" ||
	value === "BOTH" ||
	value === "GOVERNMENT";

const isPhase = (value: unknown): value is GamePhase =>
	typeof value === "string" &&
	["GOVERNMENT_SELECTION", "SELECTION", "VOTING", "CALCULATION"].includes(
		value.toUpperCase(),
	);

const numberOrNull = (value: unknown): number | null =>
	typeof value === "number" && Number.isSafeInteger(value) ? value : null;

const parseTeams = (data: Record<string, unknown>) =>
	(Array.isArray(data.teams) ? data.teams : []).flatMap((value) => {
		const team = asRecord(value);
		const id = numberOrNull(team?.id);
		const sideId = numberOrNull(team?.sideId ?? team?.side_id);
		const role = team?.role;
		return id && sideId && isRole(role) ? [{ id, sideId, role }] : [];
	});

const actorFromGameState = (
	value: unknown,
	roleOverride?: "ADMIN",
): CommunicationActor | null => {
	const root = asRecord(value);
	const data = asRecord(root?.data) ?? root;
	if (!data) return null;
	const game = asRecord(data.game);
	if (!game) return null;
	const context = asRecord(data.clientContext ?? data.client_context);
	const teams = parseTeams(data);
	const teamId = numberOrNull(
		context?.currentTeamId ?? context?.current_team_id,
	);
	const sideId = numberOrNull(
		context?.currentSideId ?? context?.current_side_id,
	);
	const currentTeam = teams.find((team) => team.id === teamId);
	const rawPhase = game.currentPhase ?? game.current_phase ?? game.phase;
	const gameId = game.gameId ?? game.game_id ?? game.id;
	if (gameId === null || gameId === undefined) return null;
	return {
		userId:
			roleOverride === "ADMIN"
				? 0
				: (numberOrNull(context?.currentUserId ?? context?.current_user_id) ??
					0),
		teamId: roleOverride === "ADMIN" ? null : teamId,
		sideId: roleOverride === "ADMIN" ? null : sideId,
		role: roleOverride ?? currentTeam?.role ?? "BOTH",
		gameId: String(gameId),
		turn: numberOrNull(game.currentTurn ?? game.current_turn),
		phase: isPhase(rawPhase)
			? (String(rawPhase).toUpperCase() as GamePhase)
			: null,
		teams,
		permissions: {
			allowPublicAnnouncements:
				process.env.COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS === "true" ||
				process.env.NEXT_PUBLIC_COMMUNICATION_ALLOW_PUBLIC_ANNOUNCEMENTS ===
					"true",
			allowPlayerEnemyMessaging:
				process.env.COMMUNICATION_ALLOW_PLAYER_ENEMY_MESSAGES === "true",
		},
	};
};

const requestGameState = async (
	path: "/client/game_state" | "/admin/game_state",
	authorization: string,
): Promise<{ ok: boolean; status: number; body: unknown }> => {
	if (GAME_SERVER_URLS.length === 0) {
		throw new CommunicationHttpError(
			503,
			"GAME_SERVER_NOT_CONFIGURED",
			"آدرس سرور بازی برای احراز هویت تنظیم نشده است.",
		);
	}
	for (const [index, gameServerUrl] of GAME_SERVER_URLS.entries()) {
		try {
			const response = await fetch(
				`${gameServerUrl.replace(/\/$/, "")}${path}`,
				{
					headers: { Authorization: authorization },
					cache: "no-store",
				},
			);
			let body: unknown = null;
			try {
				body = await response.json();
			} catch {
				body = null;
			}
			const hasFallback = index < GAME_SERVER_URLS.length - 1;
			if (hasFallback && [404, 502, 503, 504].includes(response.status)) {
				continue;
			}
			return { ok: response.ok, status: response.status, body };
		} catch {}
	}
	throw new CommunicationHttpError(
		503,
		"GAME_SERVER_UNAVAILABLE",
		"اتصال به سرور بازی برای احراز هویت برقرار نشد.",
	);
};

export const resolveCommunicationActor = async (
	request: Request,
): Promise<CommunicationActor> => {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		throw new CommunicationHttpError(
			401,
			"AUTH_REQUIRED",
			"برای استفاده از پیام‌رسانی وارد بازی شوید.",
		);
	}

	const clientState = await requestGameState(
		"/client/game_state",
		authorization,
	);
	if (clientState.ok) {
		const actor = actorFromGameState(clientState.body);
		if (actor && actor.userId > 0) return actor;
	}

	const adminState = await requestGameState("/admin/game_state", authorization);
	if (adminState.ok) {
		const actor = actorFromGameState(adminState.body, "ADMIN");
		if (actor) return actor;
	}

	throw new CommunicationHttpError(
		clientState.status === 401 || adminState.status === 401 ? 401 : 403,
		"AUTH_INVALID",
		"نشست پیام‌رسانی معتبر نیست یا کاربر عضو بازی فعال نیست.",
	);
};
