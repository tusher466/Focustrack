import { db } from "../db"
import { getCached, setCached } from "../redis"
import { fetchCodeforcesContests } from "./codeforces"
import { fetchCodeChefContests } from "./codechef"
import type { NormalizedContest } from "./normalize"

export interface SyncResult {
  success: boolean
  codeforcesCount: number
  codechefCount: number
  totalUpserted: number
  errors: string[]
  stale: boolean
  lastUpdated: string
}

const REDIS_KEY_ALL = "contests:all"
const REDIS_KEY_CF = "contests:codeforces"
const REDIS_KEY_CC = "contests:codechef"
const REDIS_KEY_META = "contests:meta"

export async function syncContests(): Promise<SyncResult> {
  const errors: string[] = []
  let cfContests: NormalizedContest[] = []
  let ccContests: NormalizedContest[] = []

  // Try Codeforces
  try {
    cfContests = await fetchCodeforcesContests()
    await setCached(REDIS_KEY_CF, cfContests, 1800)
  } catch (e) {
    console.warn("Codeforces fetch failed", e)
    errors.push(`Codeforces: ${String(e)}`)
    // Try cache fallback
    const cached = await getCached<NormalizedContest[]>(REDIS_KEY_CF)
    if (cached && Array.isArray(cached)) {
      cfContests = cached
      errors.push("Codeforces: served from cache (stale)")
    }
  }

  // Try CodeChef
  try {
    ccContests = await fetchCodeChefContests()
    await setCached(REDIS_KEY_CC, ccContests, 1800)
  } catch (e) {
    console.warn("CodeChef fetch failed", e)
    errors.push(`CodeChef: ${String(e)}`)
    const cached = await getCached<NormalizedContest[]>(REDIS_KEY_CC)
    if (cached && Array.isArray(cached)) {
      ccContests = cached
      errors.push("CodeChef: served from cache (stale)")
    }
  }

  const all = [...cfContests, ...ccContests].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Upsert to DB
  let upserted = 0
  for (const contest of all) {
    try {
      await db.contest.upsert({
        where: { platform_externalId: { platform: contest.platform, externalId: contest.externalId } },
        update: {
          name: contest.name,
          startTime: contest.startTime,
          durationSec: contest.durationSec,
          url: contest.url,
          phase: contest.phase,
        },
        create: {
          platform: contest.platform,
          externalId: contest.externalId,
          name: contest.name,
          startTime: contest.startTime,
          durationSec: contest.durationSec,
          url: contest.url,
          phase: contest.phase,
        },
      })
      upserted++
    } catch (e) {
      console.warn("Upsert failed for contest", contest.externalId, e)
      errors.push(`Upsert ${contest.externalId}: ${String(e)}`)
    }
  }

  const meta = { lastUpdated: new Date().toISOString(), count: all.length, errors }
  await setCached(REDIS_KEY_ALL, all, 1800)
  await setCached(REDIS_KEY_META, meta, 1800)

  const stale = errors.length > 0 && upserted === 0
  // If both sources failed and cache empty, try DB as final fallback
  if (all.length === 0) {
    try {
      const dbContests = await db.contest.findMany({ orderBy: { startTime: "asc" }, take: 50 })
      if (dbContests.length > 0) {
        const normalized: NormalizedContest[] = dbContests.map((c) => ({
          platform: c.platform,
          externalId: c.externalId,
          name: c.name,
          startTime: c.startTime,
          durationSec: c.durationSec,
          url: c.url,
          phase: c.phase,
        }))
        await setCached(REDIS_KEY_ALL, normalized, 600)
        return {
          success: true,
          codeforcesCount: 0,
          codechefCount: 0,
          totalUpserted: 0,
          errors: [...errors, "Served from DB fallback (stale)"],
          stale: true,
          lastUpdated: new Date().toISOString(),
        }
      }
    } catch {}
  }

  return {
    success: errors.length === 0 || upserted > 0,
    codeforcesCount: cfContests.length,
    codechefCount: ccContests.length,
    totalUpserted: upserted,
    errors,
    stale: stale,
    lastUpdated: meta.lastUpdated,
  }
}

export async function getContestsCached(): Promise<{ contests: NormalizedContest[]; source: "cache" | "db" | "stale"; lastUpdated?: string; isStale?: boolean }> {
  // Try cache
  const cached = await getCached<NormalizedContest[]>(REDIS_KEY_ALL)
  const meta = await getCached<{ lastUpdated: string; errors?: string[] }>(REDIS_KEY_META)

  if (cached && Array.isArray(cached) && cached.length > 0) {
    const isStale = !!(meta?.errors && meta.errors.length > 0)
    return { contests: cached.map((c: any) => ({ ...c, startTime: new Date(c.startTime) })), source: isStale ? "stale" : "cache", lastUpdated: meta?.lastUpdated, isStale }
  }

  // Fallback DB
  try {
    const dbContests = await db.contest.findMany({ orderBy: { startTime: "asc" }, take: 50 })
    const normalized = dbContests.map((c) => ({
      platform: c.platform,
      externalId: c.externalId,
      name: c.name,
      startTime: c.startTime,
      durationSec: c.durationSec,
      url: c.url,
      phase: c.phase,
    }))
    if (normalized.length > 0) {
      return { contests: normalized, source: "db" as const }
    }
  } catch (e) {
    console.warn("DB fallback failed", e)
  }

  return { contests: [], source: "db" as const }
}
