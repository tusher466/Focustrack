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

const updateSchema = z.object({
  displayName: z.string().max(100).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  timezone: z.string().optional(),
  codeforcesHandle: z.string().max(50).optional().nullable(),
  codechefHandle: z.string().max(50).optional().nullable(),
  goals: z.any().optional(),
  weeklyTargetHours: z.number().int().min(1).max(100).optional(),
})

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ profile: null })

  try {
    const profile = await db.profile.findUnique({ where: { userId }, include: { user: { select: { id: true, name: true, email: true, image: true } } } })
    const progress = await db.userProgress.findMany({ where: { userId } })
    if (!profile) return NextResponse.json({ profile: null })
    return NextResponse.json({ profile: { ...profile, user: (profile as any).user, progress } })
  } catch {
    return NextResponse.json({ profile: null })
  }
}

export async function PATCH(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const existing = await db.profile.findUnique({ where: { userId } })
    if (!existing) {
      const created = await db.profile.create({ data: { userId, ...parsed.data } as any })
      return NextResponse.json({ profile: created })
    }
    const updated = await db.profile.update({ where: { userId }, data: parsed.data as any })
    return NextResponse.json({ profile: updated })
  } catch (e) {
    console.error("Update profile error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
