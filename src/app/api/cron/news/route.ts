import { NextResponse } from "next/server"
import { syncNews } from "@/lib/news/service"

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV !== "production") return true
    return false
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${cronSecret}`) return true
  const xCron = req.headers.get("x-cron-secret")
  if (xCron === cronSecret) return true
  const url = new URL(req.url)
  const q = url.searchParams.get("cron_secret")
  if (q === cronSecret) return true
  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await syncNews()
    return NextResponse.json({ message: "News sync completed", ...result, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error("News cron error", e)
    return NextResponse.json({ error: "Failed", details: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
