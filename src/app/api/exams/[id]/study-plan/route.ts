import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateStudyPlanBackwards } from "@/lib/exams/study-plan"

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

const generateSchema = z.object({
  availableHoursPerDay: z.number().min(0.5).max(12).default(3),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const syllabusTopics = exam.syllabusTopics as any as { topic: string; confidence: number; status: "TODO" | "DOING" | "DONE" }[]
    if (!Array.isArray(syllabusTopics) || syllabusTopics.length === 0) {
      return NextResponse.json({ error: "No syllabus topics – add topics first" }, { status: 400 })
    }

    const plan = generateStudyPlanBackwards({
      examDate: new Date(exam.examDate),
      syllabusTopics,
      availableHoursPerDay: parsed.data.availableHoursPerDay,
      startDate: new Date(),
    })

    // Delete existing items and recreate
    await db.studyPlanItem.deleteMany({ where: { examId: exam.id } })

    const created = await Promise.all(
      plan.map((item) =>
        db.studyPlanItem.create({
          data: {
            examId: exam.id,
            date: item.date,
            topic: item.topic,
            durationMin: item.durationMin,
            done: false,
          },
        })
      )
    )

    return NextResponse.json({ items: created, count: created.length })
  } catch (e) {
    console.error("Generate study plan error", e)
    return NextResponse.json({ error: "Failed", details: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const schema = z.object({ itemId: z.string(), done: z.boolean() })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const item = await db.studyPlanItem.findFirst({ where: { id: parsed.data.itemId, examId: exam.id } })
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    const updated = await db.studyPlanItem.update({ where: { id: item.id }, data: { done: parsed.data.done } })
    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId }, include: { items: { orderBy: { date: "asc" } } } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ items: exam.items })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
