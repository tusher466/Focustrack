import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const examSchema = z.object({
  subject: z.string().min(1),
  examDate: z.string().datetime(),
  syllabusTopics: z.any(),
  targetScore: z.number().int().min(0).max(100).optional().nullable(),
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

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ exams: [] })
  try {
    const exams = await db.exam.findMany({ where: { userId }, orderBy: { examDate: "asc" }, include: { items: true } })
    return NextResponse.json({ exams })
  } catch {
    return NextResponse.json({ exams: [] })
  }
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = examSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    const exam = await db.exam.create({
      data: {
        userId,
        subject: parsed.data.subject,
        examDate: new Date(parsed.data.examDate),
        syllabusTopics: parsed.data.syllabusTopics,
        targetScore: parsed.data.targetScore || null,
      },
    })
    return NextResponse.json({ exam }, { status: 201 })
  } catch (e) {
    console.error("POST exam error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
