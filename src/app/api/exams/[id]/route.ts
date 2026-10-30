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
  subject: z.string().min(1).optional(),
  examDate: z.string().datetime().optional(),
  syllabusTopics: z.any().optional(),
  targetScore: z.number().int().min(0).max(100).optional().nullable(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId }, include: { items: { orderBy: { date: "asc" } }, mockTests: { orderBy: { date: "asc" } } } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ exam })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const existing = await db.exam.findFirst({ where: { id: params.id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const data: any = { ...parsed.data }
    if (data.examDate) data.examDate = new Date(data.examDate)

    const updated = await db.exam.update({ where: { id: params.id }, data })
    return NextResponse.json({ exam: updated })
  } catch (e) {
    console.error("PATCH exam error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const existing = await db.exam.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await db.exam.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
