import { getEnv } from "../env"
import { normalizeCodeforcesContest, type NormalizedContest } from "./normalize"

export async function fetchCodeforcesContests(): Promise<NormalizedContest[]> {
  const env = getEnv()
  const url = `${env.CODEFORCES_API_URL}/contest.list?gym=false`
  const res = await fetch(url, { 
    next: { revalidate: 1800 },
    headers: { "User-Agent": "FocusTrack/1.0 (+https://focustrack.dev)" }
  })
  if (!res.ok) throw new Error(`Codeforces API failed ${res.status} ${await res.text().catch(()=>"")}`)
  const data = await res.json()
  if (data.status !== "OK" || !Array.isArray(data.result)) throw new Error("Invalid CF response")
  const now = Date.now() / 1000
  const filtered = data.result.filter((c: any) => {
    const isUpcoming = c.phase === "BEFORE" || c.phase === "CODING"
    const recent = c.startTimeSeconds > now - 3 * 3600
    return isUpcoming || recent
  })
  // Sort by start time
  filtered.sort((a: any, b: any) => a.startTimeSeconds - b.startTimeSeconds)
  return filtered.map(normalizeCodeforcesContest).filter(Boolean) as NormalizedContest[]
}
