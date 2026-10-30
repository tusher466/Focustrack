import type { ContestPlatform } from "@prisma/client"

export interface NormalizedContest {
  platform: ContestPlatform
  externalId: string
  name: string
  startTime: Date
  durationSec: number
  url: string
  phase: string
}

export function normalizeCodeforcesContest(raw: any): NormalizedContest | null {
  try {
    if (!raw.id || !raw.name || !raw.startTimeSeconds || !raw.durationSeconds) return null
    return {
      platform: "CODEFORCES",
      externalId: String(raw.id),
      name: raw.name,
      startTime: new Date(raw.startTimeSeconds * 1000),
      durationSec: raw.durationSeconds,
      url: `https://codeforces.com/contests/${raw.id}`,
      phase: raw.phase || "BEFORE",
    }
  } catch {
    return null
  }
}

export function normalizeCodeChefContest(raw: any): NormalizedContest | null {
  // CodeChef API varies, handle gracefully
  try {
    const id = raw.code || raw.id || raw.contest_code
    if (!id) return null
    const start = raw.startDate ? new Date(raw.startDate) : raw.start_time ? new Date(raw.start_time) : new Date()
    return {
      platform: "CODECHEF",
      externalId: String(id),
      name: raw.name || id,
      startTime: start,
      durationSec: raw.duration ? Number(raw.duration) * 3600 : raw.durationSec || 7200,
      url: `https://www.codechef.com/${id}`,
      phase: "BEFORE",
    }
  } catch {
    return null
  }
}
