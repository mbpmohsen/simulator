import { z } from 'zod';

export const DetailResponseSchema = z.object({
    detail: z.string(),
});
export type DetailResponse = z.infer<typeof DetailResponseSchema>;

export const PlayerConfigSchema = z.object({
    name: z.string(),
    is_leader: z.boolean().default(false),
    vote_weight: z.number().default(1.0),
});
export type PlayerConfig = z.infer<typeof PlayerConfigSchema>;

export const BlackMarketItemConfigSchema = z.object({
    name: z.string(),
    item_type: z.string(),
    effect_type: z.string(),
    target_action: z.string(),
    target_action_type: z.string(),
    value: z.number(),
    duration: z.number().int(),
    cost: z.number(),
});
export type BlackMarketItemConfig = z.infer<typeof BlackMarketItemConfigSchema>;

export const GameEventConfigSchema = z.object({
    name: z.string(),
    effect_type: z.string(),
    target_action: z.string(),
    target_action_type: z.string(),
    value: z.number(),
    start_turn: z.number().int(),
    duration: z.number().int(),
    modifier_type: z.string().default('increase'),
    affected_sides: z.array(z.string()).nullable().default(null),
    limit_type: z.string().nullable().default(null),
    limit_value: z.number().nullable().default(null),
});
export type GameEventConfig = z.infer<typeof GameEventConfigSchema>;

export const ConfigureEventsRequestSchema = z.object({
    events: z.array(GameEventConfigSchema),
});
export type ConfigureEventsRequest = z.infer<typeof ConfigureEventsRequestSchema>;

export const ConfigureAllRequestSchema = z.object({
    side_names: z.array(z.string()),
    team_names: z.array(z.string()),
    num_turns: z.number().int(),
    teams_and_players: z.record(z.string(), z.array(PlayerConfigSchema)),
    side_assignments: z.record(z.string(), z.string()),
    point_threshold: z.number().int(),
    actions: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.union([z.number(), z.string()])))),
    team_growth_factors: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.number()))),
    team_tech_factors: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.number()))).nullable().default(null),
    side_credits: z.record(z.string(), z.number()),
    black_market_items: z.array(BlackMarketItemConfigSchema),
    player_codes: z.record(z.string(), z.array(z.record(z.string(), z.string()))).nullable().default(null),
});
export type ConfigureAllRequest = z.infer<typeof ConfigureAllRequestSchema>;

export const CurrentEventsResponseSchema = z.record(z.string(), z.any());
export type CurrentEventsResponse = z.infer<typeof CurrentEventsResponseSchema>;