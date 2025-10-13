import { type CreateNextContextOptions } from '@trpc/server/adapters/next';

export const createTRPCContext = (opts: { headers: Headers }) => {
    return {
        headers: opts.headers,
    };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
