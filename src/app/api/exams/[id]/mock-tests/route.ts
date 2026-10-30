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
  date: z.string().datetime().or(z.string().date()),
  score: z.number().int().min(0).max(1000),
  total: z.number().int().min(1).max(1000).default(100),
  notes: z.string().max(1000).optional().nullable(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId }, include: { mockTests: { orderBy: { date: "asc" } } } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ mockTests: exam.mockTests })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const exam = await db.exam.findFirst({ where: { id: params.id, userId } })
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const mockTest = await db.examMockTest.create({
      data: {
        examId: exam.id,
        date: new Date(parsed.data.date),
        score: parsed.data.score,
        total: parsed.data.total,
        notes: parsed.data.notes,
      },
    })

    return NextResponse.json({ mockTest }, { status: 201 })
  } catch (e) {
    console.error("Create mock test error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
