import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { taskUpdateSchema } from "@/lib/validators/task"

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const task = await db.task.findFirst({ where: { id: params.id, userId }, include: { cpLogs: true } })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ task })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = taskUpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await db.task.findFirst({ where: { id: params.id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const data = parsed.data as any

    // If status changed to DONE, set completedAt
    let completedAt = existing.completedAt
    if (data.status) {
      if (data.status === "DONE" && existing.status !== "DONE") completedAt = new Date()
      if (data.status !== "DONE") completedAt = null
    }

    const updated = await db.task.update({
      where: { id: params.id },
      data: {
        title: data.title,
        notes: data.notes,
        track: data.track,
        status: data.status,
        priority: data.priority,
        dueAt: data.dueAt !== undefined ? (data.dueAt ? new Date(data.dueAt) : null) : undefined,
        estimateMin: data.estimateMin,
        tags: data.tags,
        completedAt,
      },
    })

    // XP on completion
    if (data.status === "DONE" && existing.status !== "DONE") {
      try {
        const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: existing.track } } })
        if (progress) {
          const xpGain = existing.priority === "HIGH" ? 20 : existing.priority === "URGENT" ? 30 : existing.priority === "MEDIUM" ? 10 : 5
          await db.userProgress.update({ where: { id: progress.id }, data: { xp: progress.xp + xpGain, lastActiveDate: new Date() } })
        }
      } catch {}
    }

    return NextResponse.json({ task: updated })
  } catch (e) {
    console.error("PATCH task error", e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const existing = await db.task.findFirst({ where: { id: params.id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.task.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE task error", e)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
