import { db } from "../db"
import { getCached, setCached } from "../redis"
import { fetchAllNews, RawNewsItem } from "./sources"

export async function syncNews(): Promise<{ count: number; newCount: number; errors: string[] }> {
  const errors: string[] = []
  let items: RawNewsItem[] = []

  try {
    items = await fetchAllNews()
  } catch (e) {
    errors.push(String(e))
    return { count: 0, newCount: 0, errors }
  }

  let newCount = 0
  for (const item of items) {
    try {
      const existing = await db.newsItem.findUnique({ where: { url: item.url } }).catch(() => null)
      if (!existing) {
        await db.newsItem.create({
          data: {
            source: item.source,
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            summary: item.summary?.slice(0, 500),
            tags: item.tags,
          },
        })
        newCount++
      }
    } catch (e) {
      // Ignore duplicate or other errors
      // console.warn("Upsert news failed", e)
    }
  }

  // Cache aggregated list
  await setCached("news:all", items, 7200)
  await setCached("news:meta", { lastUpdated: new Date().toISOString(), count: items.length }, 7200)

  return { count: items.length, newCount, errors }
}

export async function getNewsCached(): Promise<{ items: RawNewsItem[]; source: "cache" | "db"; isStale: boolean; lastUpdated?: string }> {
  const cached = await getCached<RawNewsItem[]>("news:all")
  const meta = await getCached<{ lastUpdated: string }>("news:meta")

  if (cached && Array.isArray(cached) && cached.length > 0) {
    return { items: cached.map((c: any) => ({ ...c, publishedAt: new Date(c.publishedAt) })), source: "cache", isStale: false, lastUpdated: meta?.lastUpdated }
  }

  // Fallback DB
  try {
    const dbItems = await db.newsItem.findMany({ orderBy: { publishedAt: "desc" }, take: 50 })
    const mapped = dbItems.map((item) => ({
      source: item.source,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      summary: item.summary || undefined,
      tags: item.tags,
    }))
    if (mapped.length > 0) {
      return { items: mapped, source: "db", isStale: true }
    }
  } catch {}

  return { items: [], source: "db", isStale: true }
}
