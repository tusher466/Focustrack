import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

const createSchema = z.object({
  track: z.enum(["CP", "ACADEMIC", "VIBE"]).optional().nullable(),
  taskId: z.string().optional().nullable(),
  type: z.enum(["POMODORO", "TIMER", "STOPWATCH"]),
  plannedSec: z.number().int().min(1),
  actualSec: z.number().int().min(1).optional().nullable(),
  startedAt: z.string().datetime().optional(),
})

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ sessions: [] })
  try {
    const sessions = await db.focusSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 100, include: { task: true } })
    return NextResponse.json({ sessions })
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const session = await db.focusSession.create({
      data: {
        userId,
        track: parsed.data.track || null,
        taskId: parsed.data.taskId || null,
        type: parsed.data.type as any,
        plannedSec: parsed.data.plannedSec,
        actualSec: parsed.data.actualSec || parsed.data.plannedSec,
        startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(Date.now() - (parsed.data.actualSec || parsed.data.plannedSec) * 1000),
        endedAt: new Date(),
      },
    })

    // Update best-time analytics indirectly – data now in DB, lib/analytics/best-time.ts will use it
    // Also update weekly target hours? No, but update UserProgress lastActiveDate
    if (parsed.data.track) {
      try {
        const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: parsed.data.track } } })
        if (progress) {
          await db.userProgress.update({ where: { id: progress.id }, data: { lastActiveDate: new Date() } })
        }
      } catch {}
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (e) {
    console.error("Create focus session error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
