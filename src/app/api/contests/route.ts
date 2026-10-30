import { NextResponse } from "next/server"
import { getContestsCached } from "@/lib/contests/service"

export async function GET() {
  try {
    const { contests, source, lastUpdated, isStale } = await getContestsCached()

    // Sort by start time
    const sorted = contests.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    return NextResponse.json({
      contests: sorted,
      meta: {
        source,
        isStale: !!isStale || source === "stale",
        lastUpdated,
        count: sorted.length,
      },
    })
  } catch (e) {
    console.error("GET /api/contests error", e)
    return NextResponse.json({ contests: [], meta: { source: "error", count: 0, isStale: true }, error: "Failed to fetch contests" }, { status: 200 })
  }
}
