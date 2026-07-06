import type { GameEvent } from "../game-server/types.js";
import type {
	GameInfo,
	GameStateData,
	SideSchema,
	TeamSchema,
} from "./types.js";

export type GameOutcome = "win" | "loss" | "draw";

export interface GameConclusionSide {
	side: SideSchema;
	points: number;
	credits: number;
	teams: TeamSchema[];
	isWinner: boolean;
}

export interface GameConclusion {
	finished: boolean;
	isDraw: boolean;
	winnerSideId: number | null;
	winnerSide: SideSchema | null;
	currentSideOutcome: GameOutcome;
	sides: GameConclusionSide[];
}

const normalizeStatus = (value: unknown): string =>
	typeof value === "string" ? value.trim().toUpperCase() : "";

const numericValue = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

export const isGameFinished = (game: GameInfo | null | undefined): boolean => {
	if (!game) return false;
	const status = normalizeStatus(game.status);
	const phase = normalizeStatus(game.phase);
	const finalTurnEnded =
		numericValue(game.totalTurns) > 0 &&
		numericValue(game.currentTurn) >= numericValue(game.totalTurns) &&
		normalizeStatus(game.turnStatus) === "ENDED" &&
		normalizeStatus(game.phaseStatus) === "ENDED";
	return status === "ENDED" || phase === "FINISHED" || finalTurnEnded;
};

export const isTerminalGameEvent = (event: Pick<GameEvent, "type">): boolean =>
	[
		"GAME_ENDED",
		"GAME_FINISHED",
		"GAME_OVER",
		"WINNER_DECLARED",
		"DRAW_DECLARED",
	].includes(event.type.toUpperCase());

export const buildGameConclusion = (
	state: GameStateData,
	currentSideId = state.clientContext?.currentSideId ?? null,
): GameConclusion => {
	const winnerSideId = state.game.winnerSideId ?? null;
	const winnerSide =
		winnerSideId === null
			? null
			: (state.sides.find((side) => side.id === winnerSideId) ?? null);
	const sides = state.sides
		.map((side): GameConclusionSide => {
			const teams = state.teams
				.filter((team) => team.sideId === side.id)
				.sort(
					(first, second) =>
						numericValue(second.points) - numericValue(first.points),
				);
			return {
				side,
				points: teams.reduce(
					(total, team) => total + numericValue(team.points),
					0,
				),
				credits:
					typeof side.totalCredits === "number"
						? side.totalCredits
						: teams.reduce(
								(total, team) => total + numericValue(team.credits),
								0,
							),
				teams,
				isWinner: winnerSideId !== null && side.id === winnerSideId,
			};
		})
		.sort((first, second) => {
			if (first.isWinner !== second.isWinner) return first.isWinner ? -1 : 1;
			if (first.points !== second.points) return second.points - first.points;
			if (first.credits !== second.credits)
				return second.credits - first.credits;
			return first.side.name.localeCompare(second.side.name);
		});
	const isDraw = winnerSideId === null;
	const currentSideOutcome: GameOutcome = isDraw
		? "draw"
		: currentSideId === winnerSideId
			? "win"
			: "loss";

	return {
		finished: isGameFinished(state.game),
		isDraw,
		winnerSideId,
		winnerSide,
		currentSideOutcome,
		sides,
	};
};
