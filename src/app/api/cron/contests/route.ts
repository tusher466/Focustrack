import { NextResponse } from "next/server"
import { syncContests } from "@/lib/contests/service"

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // Allow in dev if no secret set
    if (process.env.NODE_ENV !== "production") return true
    return false
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${cronSecret}`) return true
  const xCron = req.headers.get("x-cron-secret")
  if (xCron === cronSecret) return true
  const url = new URL(req.url)
  const querySecret = url.searchParams.get("cron_secret")
  if (querySecret === cronSecret) return true
  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized - invalid CRON_SECRET" }, { status: 401 })
  }

  try {
    const result = await syncContests()
    return NextResponse.json({
      message: "Contest sync completed",
      ...result,
    })
  } catch (e) {
    console.error("Cron contests sync error", e)
    return NextResponse.json({ error: "Sync failed", details: String(e) }, { status: 500 })
  }
}

// Also allow POST for Vercel Cron that may POST
export async function POST(req: Request) {
  return GET(req)
}
