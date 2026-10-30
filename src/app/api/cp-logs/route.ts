import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const cpLogSchema = z.object({
  taskId: z.string().optional().nullable(),
  platform: z.enum(["CODEFORCES", "CODECHEF", "OTHER"]).default("CODEFORCES"),
  problemUrl: z.string().url().or(z.string().min(3)),
  rating: z.number().int().min(0).max(4000).optional().nullable(),
  topics: z.array(z.string()).default([]),
  result: z.enum(["SOLVED", "PARTIAL", "FAILED", "EDITORIAL_USED"]),
  timeSpentMin: z.number().int().min(1).max(1000).optional().nullable(),
})

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

export async function GET(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ logs: [] })
  const logs = await db.cpProblemLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 })
  return NextResponse.json({ logs })
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = cpLogSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const log = await db.cpProblemLog.create({
      data: {
        userId,
        taskId: parsed.data.taskId || null,
        platform: parsed.data.platform as any,
        problemUrl: parsed.data.problemUrl,
        rating: parsed.data.rating || null,
        topics: parsed.data.topics || [],
        result: parsed.data.result as any,
        timeSpentMin: parsed.data.timeSpentMin || null,
      },
    })

    // XP for solving
    try {
      const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: "CP" } } })
      if (progress) {
        let xp = 10
        if (parsed.data.result === "SOLVED") xp = 25
        if (parsed.data.rating && parsed.data.rating >= 1600) xp += 10
        await db.userProgress.update({ where: { id: progress.id }, data: { xp: progress.xp + xp, lastActiveDate: new Date() } })
      }
    } catch {}

    return NextResponse.json({ log }, { status: 201 })
  } catch (e) {
    console.error("POST cp-log error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
