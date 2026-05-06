import { z } from "zod";

const Env = z.object({
  PUBG_API_KEY: z.string().optional().default(""),
  PUBG_USE_MOCKS: z.enum(["0", "1"]).optional().default("0"),
  PUBG_DEFAULT_SHARD: z
    .enum(["steam", "psn", "xbox", "kakao", "console", "stadia"])
    .optional()
    .default("steam"),
  GITHUB_TOKEN: z.string().optional().default(""),
});

const parsed = Env.safeParse(process.env);

export const env = parsed.success
  ? parsed.data
  : Env.parse({});

export const useMocks = env.PUBG_USE_MOCKS === "1" || !env.PUBG_API_KEY;
