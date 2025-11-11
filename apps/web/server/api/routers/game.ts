import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@/env";
import { publicProcedure, router } from "../trpc";
import { Agent } from "undici";

const insecureAgent =
    env.NODE_ENV !== "production" && process.env.ALLOW_INSECURE_TLS === "true"
        ? new Agent({ connect: { rejectUnauthorized: false } })
        : undefined;


/** ---------- Schemas from your OpenAPI ---------- **/
export const WaitForPhaseRequest = z.object({
    phase: z.string().nullable().default("voting"),
    timeout_sec: z.number().int().default(30),
    poll_ms: z.number().int().default(200),
    stop_on_finish: z.boolean().default(true),
});

export type WaitForPhaseRequest = z.infer<typeof WaitForPhaseRequest>;

export const WaitForPhaseResponse = z.object({
    finished: z.boolean(),
    timeout: z.boolean(),
    phase: z.string(),
    player_code: z.string().nullable().optional(),
});
export type WaitForPhaseResponse = z.infer<typeof WaitForPhaseResponse>;

export const ClientActionRequest = z.object({
    code: z.string(),
    target: z.string().nullable().optional(),
    black_market_item_code: z.string().nullable().optional(),
});
export type ClientActionRequest = z.infer<typeof ClientActionRequest>;

/** ---------- Upstream helper ---------- **/
async function upstreamJSON<T>(
    path: string,
    init?: RequestInit & { timeoutMs?: number; headers?: Record<string, string | string[] | undefined> }
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 60_000);
    const url = `${env.GAME_API_URL}${path}`;

    try {
        const res = await fetch(url, {
            ...init,
            headers: {
                "content-type": "application/json",
                ...(init?.headers || {}),
            },
            signal: controller.signal,
            cache: "no-store",
            // undici option (safe to omit if not using TLS bypass)
            dispatcher: insecureAgent,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new TRPCError({
                code: res.status === 404 ? "NOT_FOUND" : "BAD_REQUEST",
                message: `Upstream ${res.status} ${res.statusText} ${text}`,
            });
        }

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return undefined as unknown as T;
        return (await res.json()) as T;
    } catch (err: any) {
        // <-- This prints the true low-level cause: ECONNREFUSED, ENOTFOUND, TLS error, etc.
        console.error("[upstream fetch error]", { url, cause: err?.cause ?? err });
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Fetch failed for ${url}`,
            cause: err,
        });
    } finally {
        clearTimeout(timeout);
    }
}

/** ---------- Router ---------- **/
export const gameRouter = router({
    getGameState: publicProcedure.query(({ ctx }) => {
        return upstreamJSON<unknown>("/client/game_state", {
            method: "GET",
            headers: ctx.headers,
        });
    }),

    getAvailableActions: publicProcedure
        .input(z.object({ player_code: z.string() }))
        .query(({ input }) => {
            return upstreamJSON<unknown>(`/client/actions/${encodeURIComponent(input.player_code)}`, {
                method: "GET",
            });
        }),

    getAvailableTargets: publicProcedure
        .input(z.object({ player_code: z.string() }))
        .query(({ input }) => {
            return upstreamJSON<unknown>(`/client/targets/${encodeURIComponent(input.player_code)}`, {
                method: "GET",
            });
        }),

    connectClient: publicProcedure
        .input(z.object({ player_code: z.string() }))
        .mutation(({ input }) => {
            return upstreamJSON<unknown>(`/client/connect/${encodeURIComponent(input.player_code)}`, {
                method: "POST",
                body: JSON.stringify({}),
            });
        }),

    waitForPhase: publicProcedure
        .input(WaitForPhaseRequest)
        .mutation(async ({ input }) => {
            // We *know* expected shape from your description; validate it here:
            const raw = await upstreamJSON<unknown>("/client/wait_for_phase", {
                method: "POST",
                body: JSON.stringify(input),
                // give upstream a bit more than timeout_sec to respond:
                timeoutMs: (input.timeout_sec + 5) * 1000,
            });
            // If upstream returns a superset, this will still narrow:
            return WaitForPhaseResponse.parse(raw);
        }),

    voteAction: publicProcedure
        .input(ClientActionRequest)
        .mutation(({ input }) => {
            return upstreamJSON<unknown>("/client/vote_action", {
                method: "POST",
                body: JSON.stringify(input),
            });
        }),
});
