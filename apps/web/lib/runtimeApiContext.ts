import type {
	ActionSchema,
	GameClientApi,
	GamePhase,
	TeamRoleType,
	TeamSchema,
} from "@workspace/trpc";
import { isGamePhase } from "@/lib/runtimeTranslationsFa";

export interface RuntimeApiContext {
	gameId: string | null;
	currentTurn: number | null;
	currentPhase: GamePhase | null;
	teamId: number | null;
	sideId: number | null;
	role: TeamRoleType | null;
	teams: TeamSchema[];
	actions: ActionSchema[];
}

const isTeamRole = (value: unknown): value is TeamRoleType =>
	value === "ATTACKER" ||
	value === "DEFENCER" ||
	value === "BOTH" ||
	value === "GOVERNMENT";

export const loadRuntimeApiContext = async (
	api: GameClientApi,
): Promise<RuntimeApiContext> => {
	const response = await api.getGameState();
	const game = response.data.game;
	const teamId = response.data.clientContext?.currentTeamId ?? null;
	const sideId = response.data.clientContext?.currentSideId ?? null;
	const team = response.data.teams.find((item) => item.id === teamId);
	const rawPhase = game.currentPhase ?? game.phase;
	return {
		gameId: game.gameId ? String(game.gameId) : null,
		currentTurn: game.currentTurn,
		currentPhase: isGamePhase(rawPhase)
			? (rawPhase.toUpperCase() as GamePhase)
			: null,
		teamId,
		sideId,
		role: isTeamRole(team?.role) ? team.role : null,
		teams: response.data.teams,
		actions: response.data.actions,
	};
};
