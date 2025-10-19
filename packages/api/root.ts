import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { gameClientRouter } from "./game-server/router";
import { gameServerRouter } from "./game-client/router";

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
