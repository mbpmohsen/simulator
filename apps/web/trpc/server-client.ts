import { httpBatchLink } from "@trpc/client";
import { createTRPCProxyClient } from "@trpc/client";
import superjson from "superjson";
import { appRouter } from "@workspace/trpc";

export const serverClient = createTRPCProxyClient<typeof appRouter>({
	links: [
		httpBatchLink({
			url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
		}),
	],
	transformer: superjson,
});
