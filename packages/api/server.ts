import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { gameClientRouter } from "./game-client/router.ts";
import { gameServerRouter } from "./game-server/router.ts";

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
			return { message: `Hello ${input.name ?? "World"}!` };
		}),
	game: gameServerRouter,
	client: gameClientRouter,
});

export type AppRouter = typeof appRouter;
