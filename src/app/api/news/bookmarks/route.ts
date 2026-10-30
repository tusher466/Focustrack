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

const bookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  source: z.string().optional(),
})

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = bookmarkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    // Ensure NewsItem exists, if not create minimal
    let newsItem = await db.newsItem.findUnique({ where: { url: parsed.data.url } })
    if (!newsItem) {
      newsItem = await db.newsItem.create({
        data: {
          source: parsed.data.source || "Unknown",
          title: parsed.data.title || parsed.data.url,
          url: parsed.data.url,
          publishedAt: new Date(),
          tags: [],
        },
      })
    }

    const bookmark = await db.newsBookmark.upsert({
      where: { userId_newsItemId: { userId, newsItemId: newsItem.id } },
      update: {},
      create: { userId, newsItemId: newsItem.id },
    })

    return NextResponse.json({ bookmark }, { status: 201 })
  } catch (e) {
    console.error("Bookmark error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

  try {
    const newsItem = await db.newsItem.findUnique({ where: { url } })
    if (!newsItem) return NextResponse.json({ success: true })

    await db.newsBookmark.deleteMany({ where: { userId, newsItemId: newsItem.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Delete bookmark error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ bookmarks: [] })

  try {
    const bookmarks = await db.newsBookmark.findMany({ where: { userId }, include: { newsItem: true }, orderBy: { createdAt: "desc" } })
    return NextResponse.json({ bookmarks })
  } catch {
    return NextResponse.json({ bookmarks: [] })
  }
}
