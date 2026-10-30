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
  title: z.string().min(1).max(200).optional(),
  prompt: z.string().min(5).max(10000).optional(),
  rating: z.enum(["WORKED", "DIDNT_WORK"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const existing = await db.promptLibrary.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await db.promptLibrary.update({ where: { id: params.id }, data: parsed.data as any })
  return NextResponse.json({ prompt: updated })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const existing = await db.promptLibrary.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await db.promptLibrary.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
