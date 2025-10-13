import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';

export const createTRPCContext = (opts: { headers: Headers }) => {
    return {
        ...opts,
    };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape;
    },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const appRouter = router({
    greeting: publicProcedure
        .input(z.object({ name: z.string().optional() }))
        .query(({ input }) => {
            return { message: `Hello ${input.name ?? 'World'}!` };
        }),
});

export type AppRouter = typeof appRouter;