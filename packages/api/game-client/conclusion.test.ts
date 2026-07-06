import { describe, expect, it } from "vitest";
import {
	buildGameConclusion,
	isGameFinished,
	isTerminalGameEvent,
} from "./conclusion";
import type { GameStateData } from "./types";

const createFinishedState = (): GameStateData => ({
	game: {
		id: 1,
		gameId: "1783357167907814362",
		phase: "finished",
		status: "ENDED",
		currentTurn: 5,
		totalTurns: 5,
		pointThreshold: 20,
		winnerSideId: null,
		currentPhase: null,
		turnStatus: "ENDED",
		phaseStatus: "ENDED",
		serverTime: 1,
	},
	clientContext: {
		currentUserId: 9000000001,
		currentTeamId: 1100000102,
		currentSideId: 1100000001,
	},
	sides: [
		{
			id: 1100000001,
			name: "Red",
			totalCredits: 341,
			teamIds: [1100000101, 1100000102],
		},
		{
			id: 2200000001,
			name: "Blue",
			totalCredits: 400,
			teamIds: [2200000101, 2200000102],
		},
	],
	teams: [
		{
			id: 1100000101,
			name: "Red Government",
			sideId: 1100000001,
			points: 0,
			credits: 100,
		},
		{
			id: 1100000102,
			name: "Red Team",
			sideId: 1100000001,
			points: 5,
			credits: 241,
		},
		{
			id: 2200000101,
			name: "Blue Government",
			sideId: 2200000001,
			points: 0,
			credits: 100,
		},
		{
			id: 2200000102,
			name: "Blue Team",
			sideId: 2200000001,
			points: 0,
			credits: 300,
		},
	],
	players: [],
	actions: [],
	blackMarketItems: [],
	events: [],
});

describe("game conclusion", () => {
	it("honors a null winnerSideId as an official draw", () => {
		const conclusion = buildGameConclusion(createFinishedState());

		expect(conclusion.finished).toBe(true);
		expect(conclusion.isDraw).toBe(true);
		expect(conclusion.currentSideOutcome).toBe("draw");
		expect(
			conclusion.sides.map(({ side, points }) => [side.name, points]),
		).toEqual([
			["Red", 5],
			["Blue", 0],
		]);
	});

	it("uses the server winner for the current side outcome and ordering", () => {
		const state = createFinishedState();
		state.game.winnerSideId = 2200000001;
		const conclusion = buildGameConclusion(state);

		expect(conclusion.isDraw).toBe(false);
		expect(conclusion.winnerSide?.name).toBe("Blue");
		expect(conclusion.currentSideOutcome).toBe("loss");
		expect(conclusion.sides[0]?.side.name).toBe("Blue");
	});

	it("recognizes state and event terminal signals", () => {
		expect(isGameFinished(createFinishedState().game)).toBe(true);
		expect(isTerminalGameEvent({ type: "GAME_ENDED" })).toBe(true);
		expect(isTerminalGameEvent({ type: "DRAW_DECLARED" })).toBe(true);
		expect(isTerminalGameEvent({ type: "TURN_ENDED" })).toBe(false);
	});
});
