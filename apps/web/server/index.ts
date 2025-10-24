import {baseProcedure, createTRPCRouter} from "@/server/trpc.ts";

export const appRouter = createTRPCRouter({
    getTodos: baseProcedure.query(async () => {
        return [1,2,3,4,5];
    })
})

export type AppRouter = ReturnType<typeof appRouter>;