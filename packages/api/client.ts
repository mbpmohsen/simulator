import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./server.ts";

// This is safe for client components - no server code
export const trpc = createTRPCReact<AppRouter>();

// Client helper for server components (if needed)
export { createTRPCProxyClient } from "@trpc/client";
export type { TRPCClientErrorLike } from "@trpc/client";
