import { z } from 'zod';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
    greeting: publicProcedure
        .input(z.object({ name: z.string().optional() }))
        .query(({ input }) => {
            return { message: `Hello ${input.name ?? 'World'}!` };
        }),
    // Add more procedures here
});

export type AppRouter = typeof appRouter;