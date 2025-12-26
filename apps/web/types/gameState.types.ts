export interface ActionConfig {
    probability: number;
    counter_actions: string;
    cost: number;
}

export type ActionSide = "attack" | "defense";
export type BlackMarketItemType = "probability" | "growth" | "cost" | "tech";
export type EffectType = "increase" | "multiply";
export type TargetActionType = "attack" | "defense";

export interface GameStateResponse {
    available_actions: {
        attack: Record<string, ActionConfig>;
        defense: Record<string, ActionConfig>;
    };

    action_codes: Record<string, [ActionSide, string]>;

    black_market_item_codes: Record<string, ["black_market", string]>;

    black_market_items: Array<{
        name: string;
        item_type: BlackMarketItemType;
        effect_type: EffectType;
        target_action: string;
        target_action_type: TargetActionType;
        value: number;
        duration: number;
        cost: number;
    }>;

    available_targets: unknown[]; // Could be string[] or more complex objects

    current_phase: string; // Could be more specific like "voting" | "action" | "results" | "waiting for others to connect" etc.
    remaining_time: number;
    current_turn: number;
    total_turns: number;

    teams: Record<string, string>; // team_name -> side_name

    sides: string[];

    team_credits: number; // Credits for the current team

    active_effects: unknown[]; // Could be more specific if structure is known

    side_credits: Record<string, number>; // side_name -> credits

    events: unknown[]; // Could be more specific if structure is known

    points: Record<string, number>; // side_name -> points
}