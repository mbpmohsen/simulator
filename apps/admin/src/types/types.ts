export interface Player {
    name: string;
    is_leader: boolean;
    vote_weight: number;
}

export interface ActionConfig {
    probability: number;
    counter_actions: string;
    cost: number;
    techniques?: string[];
    tactics?: string[];
}

export interface Actions {
    attack: Record<string, ActionConfig>;
    defense: Record<string, ActionConfig>;
}

export interface TeamFactors {
    attack: Record<string, number>;
    defense: Record<string, number>;
}

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

export interface GameConfiguration {
    side_names: string[];
    team_names: string[];
    num_turns: number;
    teams_and_players: Record<string, Player[]>;
    side_assignments: Record<string, string>;
    point_threshold: number;
    actions: Actions;
    team_growth_factors: Record<string, TeamFactors>;
    team_tech_factors: Record<string, TeamFactors>;
    side_credits: Record<string, number>;
    black_market_items: BlackMarketItem[];
}

export type ActionSide = "attack" | "defense";
export type BlackMarketItemType = "probability" | "growth" | "cost" | "tech";
export type EffectType = "increase" | "multiply";
export type TargetActionType = "attack" | "defense";

export interface ActionConfig {
  probability: number;
  counter_actions: string;
  cost: number;
}

export interface ConfigureAllResponse {
  detail: string;

  // team_name -> [{ name, code }]
  player_codes: Record<string, Array<{ name: string; code: string }>>;

  actions: {
    attack: Record<string, ActionConfig>;
    defense: Record<string, ActionConfig>;
  };

  // code(string id) -> ["attack" | "defense", "ACTION_NAME"]
  action_codes: Record<string, [ActionSide, string]>;

  // code(string id) -> ["black_market", "ITEM_NAME"]
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

  // backend-defined; keeping it open-ended
  events: unknown[];

  // side_name -> credits
  credits_allocation: Record<string, number>;
}
