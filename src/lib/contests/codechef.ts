import { getEnv } from "../env"
import { normalizeCodeChefContest, type NormalizedContest } from "./normalize"

export async function fetchCodeChefContests(): Promise<NormalizedContest[]> {
  const env = getEnv()
  const primaryUrl = env.CODECHEF_CONTEST_URL || "https://www.codechef.com/api/list/contests/all"
  
  // Primary: CodeChef official endpoint (may require no auth, returns JSON)
  try {
    const res = await fetch(primaryUrl, {
      headers: { "User-Agent": "FocusTrack/1.0 (+https://focustrack.dev)", "Accept": "application/json" },
      next: { revalidate: 1800 },
    })
    if (res.ok) {
      const data = await res.json()
      // API returns { future_contests: [...], present_contests: [...], past_contests: [...] }
      const future = data.future_contests || []
      const present = data.present_contests || []
      const list = [...present, ...future]
      if (list.length > 0) {
        const normalized = list.map(normalizeCodeChefContest).filter(Boolean) as NormalizedContest[]
        if (normalized.length > 0) return normalized
      }
      // Sometimes it returns flat array
      const flat = data.present_contests || data.future_contests || data.contests || data
      if (Array.isArray(flat) && flat.length > 0) {
        return flat.map(normalizeCodeChefContest).filter(Boolean) as NormalizedContest[]
      }
    }
  } catch (e) {
    console.warn("Primary CodeChef fetch failed", e)
  }

  // Fallback 1: kontests.net
  const fallbackUrl = env.FALLBACK_CONTEST_API || "https://kontests.net/api/v1/code_chef"
  try {
    const res = await fetch(fallbackUrl, { 
      next: { revalidate: 1800 },
      headers: { "User-Agent": "FocusTrack/1.0" }
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
          .filter((item: any) => item.start_time && item.end_time)
          .map((item: any) => ({
            platform: "CODECHEF" as const,
            externalId: (item.name || item.url || "").slice(0, 100) || String(Date.now()),
            name: item.name || "CodeChef Contest",
            startTime: new Date(item.start_time),
            durationSec: Math.max(3600, Math.round((new Date(item.end_time).getTime() - new Date(item.start_time).getTime()) / 1000)),
            url: item.url || "https://www.codechef.com/contests",
            phase: new Date(item.start_time) > new Date() ? "BEFORE" : "CODING",
          }))
          .filter((c: any) => !isNaN(c.startTime.getTime()))
      }
    }
  } catch (e) {
    console.warn("Fallback kontests CodeChef fetch failed", e)
  }

  // Fallback 2: clist.by (requires API but we try public)
  try {
    const clistUrl = "https://clist.by/api/v1/contest/?resource__name=codechef.com&order_by=start&limit=20"
    const res = await fetch(clistUrl, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (data.objects && Array.isArray(data.objects)) {
        return data.objects.map((item: any) => ({
          platform: "CODECHEF" as const,
          externalId: String(item.id || item.event || item.resource),
          name: item.event || "CodeChef Contest",
          startTime: new Date(item.start),
          durationSec: item.duration || 7200,
          url: item.href || "https://www.codechef.com/contests",
          phase: new Date(item.start) > new Date() ? "BEFORE" : "CODING",
        }))
      }
    }
  } catch (e) {
    console.warn("Clist fallback failed", e)
  }

  throw new Error("Both CodeChef primary and fallback aggregators failed")
}
