import { Redis } from "@upstash/redis"
import { getEnv, hasRedis } from "./env"

type CacheValue = string | number | boolean | object | null

interface MemoryEntry {
  value: CacheValue
  expiresAt: number | null
}

class MemoryRedis {
  private store = new Map<string, MemoryEntry>()

  async get<T = CacheValue>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: CacheValue, opts?: { ex?: number }): Promise<string> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null
    this.store.set(key, { value, expiresAt })
    return "OK"
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const k of keys) {
      if (this.store.delete(k)) count++
    }
    return count
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0
    const next = current + 1
    await this.set(key, next)
    return next
  }
}

// Singleton
const globalForRedis = globalThis as unknown as {
  redis: Redis | MemoryRedis | undefined
}

function createRedisClient(): Redis | MemoryRedis {
  if (hasRedis()) {
    const env = getEnv()
    try {
      return new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      })
    } catch (e) {
      console.warn("Failed to create Upstash Redis, falling back to memory", e)
      return new MemoryRedis()
    }
  }
  console.warn("Redis not configured, using in-memory cache (not persistent across instances)")
  return new MemoryRedis()
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

// Helpers

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key)
    if (val === null) return null
    // Upstash already parses JSON, memory store keeps object
    return val as T
  } catch {
    return null
  }
}

export async function setCached(key: string, value: CacheValue, ttlSeconds = 600): Promise<void> {
  try {
    await (redis as any).set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined)
  } catch (e) {
    console.warn("Redis set failed", e)
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  // For simplicity, if pattern contains *, we can't scan in Upstash easily without extra config
  // So we expect exact keys for now, or keys list
  try {
    await redis.del(pattern)
  } catch {}
}

// Rate limiting simple implementation
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; remaining: number }> {
  const countKey = `ratelimit:${key}`
  const current = (await redis.get(countKey)) as number | null
  if (current === null) {
    await redis.set(countKey, 1, { ex: windowSec })
    return { allowed: true, remaining: limit - 1 }
  }
  if (current >= limit) {
    return { allowed: false, remaining: 0 }
  }
  await redis.incr(countKey)
  return { allowed: true, remaining: limit - (current + 1) }
}
