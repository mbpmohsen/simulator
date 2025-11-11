import { z } from "zod";

const schema = z.object({
    GAME_API_URL: z
        .string()
        .refine(
            (v) => {
                try {
                    new URL(v);
                    return true;
                } catch {
                    return false;
                }
            },
            { message: "Invalid URL" },
        ),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = schema.parse({
    GAME_API_URL: process.env.GAME_API_URL,
    NODE_ENV: process.env.NODE_ENV,
});
