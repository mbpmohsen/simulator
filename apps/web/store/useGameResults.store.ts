// stores/useGameResultsStore.ts
import { create } from 'zustand';

interface Player {
    name: string;
    code: string;
    is_leader: boolean;
    vote_weight: number;
}

interface TeamData {
    side: string;
    players: Player[];
    vulnerabilities: Record<string, any>;
    points: number;
    credits: number;
    action_probabilities: Record<string, any>;
    active_effects: any[];
    base_probabilities: Record<string, any>;
    current_probabilities: Record<string, any>;
    base_growth_factors: Record<string, any>;
    current_growth_factors: Record<string, any>;
    base_tech_factors: Record<string, any>;
    current_tech_factors: Record<string, any>;
    base_costs: Record<string, any>;
    current_costs: Record<string, any>;
}

interface GameResults {
    available_actions: Record<string, any>;
    action_codes: Record<string, any>;
    black_market_item_codes: Record<string, any>;
    black_market_items: any[];
    current_phase: string;
    current_turn: number;
    total_turns: number;
    teams: {
        team1: TeamData;
        team2: TeamData;
    };
    teams_by_code: Record<string, any>;
    team_codes: Record<string, any>;
    sides: string[];
    side_credits: Record<string, number>;
    events: any[];
    points: Record<string, number>;
    credits_allocation: Record<string, number>;
    game_id: string;
    winner: string;
}

interface GameResultsStore {
    gameResults: GameResults | null;
    setGameResults: (results: GameResults) => void;
    clearGameResults: () => void;
    hasGameResults: () => boolean;
}

export const useGameResultsStore = create<GameResultsStore>((set, get) => ({
    gameResults: null,

    setGameResults: (results) => set({ gameResults: results }),

    clearGameResults: () => set({ gameResults: null }),

    hasGameResults: () => get().gameResults !== null,
}));