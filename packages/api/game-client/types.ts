import { z } from "zod";

// Request schemas
export const WaitForPhaseRequestSchema = z.object({
	phase: z.string().nullable().default("voting"),
	timeout_sec: z.number().int().default(30),
	poll_ms: z.number().int().default(200),
	stop_on_finish: z.boolean().default(true),
});
export type WaitForPhaseRequest = z.infer<typeof WaitForPhaseRequestSchema>;

export const ClientActionRequestSchema = z.object({
	code: z.string(),
	target: z.string().nullable().default(null),
	black_market_item_code: z.string().nullable().default(null),
});
export type ClientActionRequest = z.infer<typeof ClientActionRequestSchema>;

// Response schemas
export const WaitForPhaseResponseSchema = z.object({
	finished: z.boolean(),
	timeout: z.boolean(),
	phase: z.string(),
	player_code: z.string().nullable(),
});
export type WaitForPhaseResponse = z.infer<typeof WaitForPhaseResponseSchema>;

export const GameStateResponseSchema = z.record(z.string(), z.any());
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;

export const AvailableActionsResponseSchema = z.record(z.string(), z.any());
export type AvailableActionsResponse = z.infer<
	typeof AvailableActionsResponseSchema
>;

export const AvailableTargetsResponseSchema = z.record(z.string(), z.any());
export type AvailableTargetsResponse = z.infer<
	typeof AvailableTargetsResponseSchema
>;

export const ConnectResponseSchema = z.object({
	connected: z.boolean(),
	player_name: z.string().nullable(),
	team: z.string().nullable(),
});
export type ConnectResponse = z.infer<typeof ConnectResponseSchema>;

export const VoteActionResponseSchema = z.object({
	success: z.boolean(),
	vote_id: z.string().nullable(),
	message: z.string().nullable(),
});
export type VoteActionResponse = z.infer<typeof VoteActionResponseSchema>;
