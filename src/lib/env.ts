import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "anthropic", "google", "groq", "ollama"]).default("openai"),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  AI_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CODEFORCES_API_URL: z.string().default("https://codeforces.com/api"),
  CODECHEF_CONTEST_URL: z.string().optional(),
  FALLBACK_CONTEST_API: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.warn("⚠️ Invalid env variables (using fallbacks for build):", parsed.error.flatten().fieldErrors)
    // Fallback dummy to allow build without DB/Auth env
    const fallback: Env = {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/focustrack",
      AUTH_SECRET: process.env.AUTH_SECRET || "dev-secret-replace-in-prod-32chars-long-must-be-32+",
      AI_PROVIDER: (process.env.AI_PROVIDER as any) || "openai",
      AI_MODEL: process.env.AI_MODEL || "gpt-4o-mini",
      AI_API_KEY: process.env.AI_API_KEY,
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
      EMAIL_SERVER: process.env.EMAIL_SERVER,
      EMAIL_FROM: process.env.EMAIL_FROM,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      CRON_SECRET: process.env.CRON_SECRET,
      CODEFORCES_API_URL: process.env.CODEFORCES_API_URL || "https://codeforces.com/api",
      NODE_ENV: (process.env.NODE_ENV as any) || "development",
    } as Env
    cachedEnv = fallback
    return cachedEnv
  }
  cachedEnv = parsed.data
  return cachedEnv
}

// Helper to check if redis is configured
export function hasRedis(): boolean {
  const env = getEnv()
  return !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN
}
