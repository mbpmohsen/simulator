import { initTRPC } from "@trpc/server";
import superjson from "superjson";

console.info("[ENV] GAME_API_URL:", process.env.GAME_API_URL);

export type TRPCContext = {
    // Forward incoming headers for auth/cookies if your upstream needs them
    headers: Record<string, string | string[] | undefined>;
};

export function createTRPCContext(opts: { req: Request }): TRPCContext {
    return { headers: Object.fromEntries(opts.req.headers) };
}

const t = initTRPC.context<TRPCContext>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export { t };
