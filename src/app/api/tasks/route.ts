import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { taskCreateSchema, taskQuerySchema } from "@/lib/validators/task"

export async function GET(req: Request) {
  try {
    const session = await auth().catch(() => null)
    // For dev without DB, allow demo user fallback
    let userId = session?.user?.id
    if (!userId) {
      // Try to find demo user
      const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
      if (demo) userId = demo.id
      else {
        return NextResponse.json({ tasks: [] })
      }
    }

    const { searchParams } = new URL(req.url)
    const query = taskQuerySchema.safeParse({
      track: searchParams.get("track") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("search") || undefined,
    })

    const where: any = { userId }
    if (query.success) {
      if (query.data.track) where.track = query.data.track
      if (query.data.status) where.status = query.data.status
      if (query.data.priority) where.priority = query.data.priority
      if (query.data.search) {
        where.OR = [
          { title: { contains: query.data.search, mode: "insensitive" } },
          { notes: { contains: query.data.search, mode: "insensitive" } },
        ]
      }
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: { cpLogs: true },
      take: 100,
    })

    return NextResponse.json({ tasks })
  } catch (e) {
    console.error("GET /api/tasks error", e)
    return NextResponse.json({ tasks: [], error: "Failed to fetch tasks" }, { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null)
    let userId = session?.user?.id
    if (!userId) {
      const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
      if (demo) userId = demo.id
      else {
        // In dev, create temp user id behaviour: still require auth ideally but allow for Phase2 demo
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json()
    const parsed = taskCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    const task = await db.task.create({
      data: {
        userId,
        track: data.track as any,
        title: data.title,
        notes: data.notes,
        status: (data.status as any) || "TODO",
        priority: (data.priority as any) || "MEDIUM",
        dueAt: data.dueAt ? new Date(data.dueAt as any) : null,
        estimateMin: data.estimateMin || null,
        tags: data.tags || [],
        completedAt: data.status === "DONE" ? new Date() : null,
      },
    })

    // Update streak / xp gamification (increment XP lightly)
    try {
      const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: data.track as any } } })
      if (progress) {
        // Simple XP logic: +10 per task create
        await db.userProgress.update({
          where: { id: progress.id },
          data: {
            xp: progress.xp + 5,
            lastActiveDate: new Date(),
          },
        })
      }
    } catch {}

    return NextResponse.json({ task }, { status: 201 })
  } catch (e) {
    console.error("POST /api/tasks error", e)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
