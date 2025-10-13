import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@workspace/trpc';
import {createTRPCContext} from "@workspace/trpc/server";

export const runtime = 'nodejs';

// This is the main handler for ALL tRPC requests
const handler = async (req: Request) => {
    return fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createTRPCContext({
            headers: req.headers
        }),
    });
};

// Export both GET and POST
export { handler as GET, handler as POST };