import { NextResponse } from "next/server"
import { z } from "zod"
import { getNewsCached } from "@/lib/news/service"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

const querySchema = z.object({
  tag: z.string().optional(),
  source: z.string().optional(),
  bookmarked: z.string().optional(),
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    tag: searchParams.get("tag") || undefined,
    source: searchParams.get("source") || undefined,
    bookmarked: searchParams.get("bookmarked") || undefined,
  })

  const tag = parsed.success ? parsed.data.tag : undefined
  const bookmarkedOnly = parsed.success && parsed.data.bookmarked === "true"

  try {
    const { items, source, isStale, lastUpdated } = await getNewsCached()

    let filtered = items

    if (tag) {
      filtered = filtered.filter((item) => item.tags.includes(tag))
    }

    // If bookmarked only, fetch user's bookmarks and filter
    let bookmarkedUrls: Set<string> | null = null
    if (bookmarkedOnly) {
      const userId = await getUserId()
      if (userId) {
        const bookmarks = await db.newsBookmark.findMany({ where: { userId }, include: { newsItem: true } })
        const urls = new Set(bookmarks.map((b) => b.newsItem.url))
        bookmarkedUrls = urls
        filtered = filtered.filter((item) => urls.has(item.url))
        // Also include bookmarked items that may not be in cached list but in DB
        if (filtered.length === 0 && bookmarks.length > 0) {
          filtered = bookmarks.map((b) => ({
            source: b.newsItem.source,
            title: b.newsItem.title,
            url: b.newsItem.url,
            publishedAt: b.newsItem.publishedAt,
            summary: b.newsItem.summary || undefined,
            tags: b.newsItem.tags,
          }))
        }
      }
    }

    // Also get all bookmarks for current user to mark isBookmarked
    let userBookmarksSet: Set<string> = new Set()
    try {
      const userId = await getUserId()
      if (userId) {
        const bookmarks = await db.newsBookmark.findMany({ where: { userId } })
        const newsIds = bookmarks.map((b) => b.newsItemId)
        if (newsIds.length > 0) {
          const newsItems = await db.newsItem.findMany({ where: { id: { in: newsIds } } })
          userBookmarksSet = new Set(newsItems.map((n) => n.url))
        }
      }
    } catch {}

    const withBookmarkFlag = filtered.map((item) => ({
      ...item,
      isBookmarked: userBookmarksSet.has(item.url),
    }))

    return NextResponse.json({
      news: withBookmarkFlag,
      meta: {
        source,
        isStale,
        lastUpdated,
        count: withBookmarkFlag.length,
        total: items.length,
      },
    })
  } catch (e) {
    console.error("GET /api/news error", e)
    return NextResponse.json({ news: [], meta: { source: "error", count: 0 } }, { status: 200 })
  }
}
