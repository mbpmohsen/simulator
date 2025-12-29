import type { ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GameStateResponse {
	available_actions: {
		attack: Record<string, ActionConfig>;
		defense: Record<string, ActionConfig>;
	};
	action_codes: Record<string, [ActionSide, string]>;
	black_market_item_codes: Record<string, ["black_market", string]>;
	black_market_items: Array<{
		effect_type: ReactNode;
		name: string;
		item_type: BlackMarketItemType;
		target_action: string;
		target_action_type: TargetActionType;
		value: number;
		duration: number;
		cost: number;
	}>;
	available_targets: unknown[];
	current_phase: string;
	remaining_time: number;
	current_turn: number;
	total_turns: number;
	teams: Record<string, string>;
	sides: string[];
	team_credits: number;
	active_effects: unknown[];
	side_credits: Record<string, number>;
	events: unknown[];
	points: Record<string, number>;
}

type ActionSide = "attack" | "defense";
type BlackMarketItemType = "probability" | "growth" | "cost" | "tech";
type TargetActionType = "attack" | "defense";

interface ActionConfig {
	probability: number;
	counter_actions: string;
	cost: number;
}

interface GameStore {
	gameState: GameStateResponse | null;
	playerCode: string | null;
	setGameState: (state: GameStateResponse) => void;
	setPlayerCode: (code: string) => void;
	clearGameState: () => void;
}

export const useGameStore = create<GameStore>()(
	persist(
		(set) => ({
			gameState: null,
			playerCode: null,
			setGameState: (state) => set({ gameState: state }),
			setPlayerCode: (code) => set({ playerCode: code }),
			clearGameState: () => set({ gameState: null, playerCode: null }),
		}),
		{
			name: "game-storage",
		},
	),
);
