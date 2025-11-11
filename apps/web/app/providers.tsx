"use client";

import { ReactNode, useState } from "react";
import { api } from "@/trpc/react";
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function TRPCProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
        api.createClient({
            transformer: superjson,
            links: [
                loggerLink({ enabled: () => process.env.NODE_ENV === "development" }),
                httpBatchLink({ url: "/api/trpc" }),
            ],
        })
    );

    return (
        <api.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </api.Provider>
    );
}
