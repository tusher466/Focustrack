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
  title: z.string().min(1).max(200),
  prompt: z.string().min(5).max(10000),
  rating: z.enum(["WORKED", "DIDNT_WORK"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).max(10).default([]),
})

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ prompts: [] })
  try {
    const prompts = await db.promptLibrary.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 })
    return NextResponse.json({ prompts })
  } catch {
    return NextResponse.json({ prompts: [] })
  }
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const created = await db.promptLibrary.create({
      data: {
        userId,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        rating: parsed.data.rating as any,
        notes: parsed.data.notes,
        tags: parsed.data.tags || [],
      },
    })

    // XP for saving prompt
    try {
      const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: "VIBE" } } })
      if (progress) {
        await db.userProgress.update({ where: { id: progress.id }, data: { xp: progress.xp + 3, lastActiveDate: new Date() } })
      }
    } catch {}

    return NextResponse.json({ prompt: created }, { status: 201 })
  } catch (e) {
    console.error("Create prompt library error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
