import { NextResponse } from "next/server"
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

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [user, profile, tasks, cpLogs, progress, focusSessions, exams, lessons, prompts] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } }),
      db.profile.findUnique({ where: { userId } }),
      db.task.findMany({ where: { userId } }),
      db.cpProblemLog.findMany({ where: { userId } }),
      db.userProgress.findMany({ where: { userId } }),
      db.focusSession.findMany({ where: { userId }, take: 100 }),
      db.exam.findMany({ where: { userId }, include: { items: true, mockTests: true } }),
      db.promptLesson.findMany({ where: { userId }, take: 100 }),
      db.promptLibrary.findMany({ where: { userId } }),
    ])

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      user,
      profile,
      tasks,
      cpLogs,
      progress,
      focusSessions,
      exams,
      lessons,
      prompts,
    })
  } catch (e) {
    console.error("Export error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
