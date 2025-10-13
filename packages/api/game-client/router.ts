import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import {
    WaitForPhaseRequestSchema,
    WaitForPhaseResponseSchema,
    GameStateResponseSchema,
    AvailableActionsResponseSchema,
    AvailableTargetsResponseSchema,
    ConnectResponseSchema,
    ClientActionRequestSchema,
    VoteActionResponseSchema,
} from './types';

export const gameClientRouter = router({
    // Game State - Wait for Phase
    waitForPhase: publicProcedure
        .meta({
            openapi: {
                method: 'POST',
                path: '/client/wait_for_phase',
                tags: ['Game State'],
                summary: 'Wait For Phase',
                description: `Block until the active client's state reaches the requested phase or until timeout.

Always returns a 200 with a small status object so orchestrators (Postman) can branch:
    { finished: bool, timeout: bool, phase: str, player_code: Optional[str] }

Semantics:
    - If disconnected (no ACTIVE_PLAYER_CODE or state), we assume game ended and return finished=true.
    - If stop_on_finish is true and phase becomes 'finished', return finished=true immediately.
    - If the current phase matches the requested phase, return finished=false, timeout=false.
    - If timeout elapses, return timeout=true with the last observed phase.`,
            },
        })
        .input(WaitForPhaseRequestSchema)
        .output(WaitForPhaseResponseSchema)
        .mutation(async ({ input }) => {
            // Implement wait for phase logic here
            console.log('Waiting for phase:', input.phase, 'timeout:', input.timeout_sec);

            // Simulate waiting logic
            // In real implementation, this would poll the game state
            return {
                finished: false,
                timeout: false,
                phase: input.phase || 'voting',
                player_code: 'player_123',
            };
        }),

    // Game State - Get Game State
    getGameState: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/client/game_state',
                tags: ['Game State'],
                summary: 'Get Game State',
            },
        })
        .input(z.void())
        .output(GameStateResponseSchema)
        .query(async () => {
            // Implement get game state logic here
            return {
                turn: 1,
                phase: 'voting',
                teams: {
                    'Team1': { points: 100, credits: 500 },
                    'Team2': { points: 80, credits: 450 },
                },
                players: {
                    'player_123': { name: 'Player1', team: 'Team1', is_connected: true },
                },
                events: [],
            };
        }),

    // Game State - Get Available Actions
    getAvailableActions: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/client/actions/{player_code}',
                tags: ['Game State'],
                summary: 'Get Available Actions',
            },
        })
        .input(z.object({
            player_code: z.string(),
        }))
        .output(AvailableActionsResponseSchema)
        .query(async ({ input }) => {
            // Implement get available actions logic here
            console.log('Getting actions for player:', input.player_code);

            return {
                actions: [
                    { code: 'attack', name: 'Attack', cost: 10 },
                    { code: 'defend', name: 'Defend', cost: 5 },
                    { code: 'trade', name: 'Trade', cost: 8 },
                    { code: 'research', name: 'Research', cost: 15 },
                ],
                black_market: [
                    { code: 'bm_super_weapon', name: 'Super Weapon', cost: 100 },
                    { code: 'bm_stealth', name: 'Stealth Technology', cost: 75 },
                ],
            };
        }),

    // Game State - Get Available Targets
    getAvailableTargets: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/client/targets/{player_code}',
                tags: ['Game State'],
                summary: 'Get Available Targets',
                description: 'Get available targets for the player.',
            },
        })
        .input(z.object({
            player_code: z.string(),
        }))
        .output(AvailableTargetsResponseSchema)
        .query(async ({ input }) => {
            // Implement get available targets logic here
            console.log('Getting targets for player:', input.player_code);

            return {
                teams: ['Team2'],
                players: ['player_456', 'player_789'],
                structures: ['base_camp', 'resource_mine'],
                regions: ['north_region', 'south_region'],
            };
        }),

    // Connection - Connect Client
    connectClient: publicProcedure
        .meta({
            openapi: {
                method: 'POST',
                path: '/client/connect/{player_code}',
                tags: ['Connection'],
                summary: 'Connect Client',
                description: 'Connect client using player code from server',
            },
        })
        .input(z.object({
            player_code: z.string(),
        }))
        .output(ConnectResponseSchema)
        .mutation(async ({ input }) => {
            // Implement connect client logic here
            console.log('Connecting client with code:', input.player_code);

            // Simulate connection logic
            // In real implementation, this would validate the player code
            return {
                connected: true,
                player_name: 'Player1',
                team: 'Team1',
            };
        }),

    // Client Actions - Vote Action
    voteAction: publicProcedure
        .meta({
            openapi: {
                method: 'POST',
                path: '/client/vote_action',
                tags: ['Client Actions'],
                summary: 'Client Vote Action',
                description: 'Vote action using existing connection.',
            },
        })
        .input(ClientActionRequestSchema)
        .output(VoteActionResponseSchema)
        .mutation(async ({ input }) => {
            // Implement vote action logic here
            console.log('Voting action:', {
                code: input.code,
                target: input.target,
                black_market_item: input.black_market_item_code,
            });

            // Simulate voting logic
            return {
                success: true,
                vote_id: `vote_${Date.now()}`,
                message: 'Vote submitted successfully',
            };
        }),
});