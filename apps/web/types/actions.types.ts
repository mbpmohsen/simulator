export interface ActionConfig {
    probability: number;
    counter_actions: string;
    cost: number;
}

export type ActionSide = "attack" | "defense";

export interface BlackMarketItem {
    name: string;
    item_type: 'probability' | 'growth' | 'cost' | 'tech';
    effect_type: 'increase' | 'multiply';
    target_action: string;
    target_action_type: 'attack' | 'defense';
    value: number;
    duration: number;
    cost: number;
}

export interface PlayerGameStateResponse {
    // Available actions for the current player
    actions: {
        attack: Record<string, ActionConfig>;
        defense: Record<string, ActionConfig>;
    };

    // Mapping of action IDs to action details
    action_codes: Record<string, [ActionSide, string]>;

    // Mapping of black market item IDs to item details
    black_market_item_codes: Record<string, ["black_market", string]>;

    // Available black market items
    black_market_items: BlackMarketItem[];

    // Available sides in the game
    sides: string[];

    // Mapping of team names to side names
    teams: Record<string, string>;

    // Current turn number
    current_turn: number;

    // Total number of turns in the game
    total_turns: number;

    // Credits available to the current player's team
    team_credits: number;

    // Active effects on the current player/team
    active_effects: unknown[]; // Could be more specific if structure is known
}