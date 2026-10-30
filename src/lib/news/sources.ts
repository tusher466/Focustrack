export interface RawNewsItem {
  source: string
  title: string
  url: string
  publishedAt: Date
  summary?: string
  tags: string[]
}

export async function fetchHackerNews(limit = 20): Promise<RawNewsItem[]> {
  try {
    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { next: { revalidate: 7200 } })
    if (!topRes.ok) return []
    const ids: number[] = await topRes.json()
    const sliced = ids.slice(0, limit)
    const items = await Promise.all(
      sliced.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { next: { revalidate: 7200 } })
        if (!r.ok) return null
        return r.json()
      })
    )
    return items
      .filter(Boolean)
      .filter((item: any) => item.title && item.url)
      .map((item: any) => ({
        source: "Hacker News",
        title: item.title,
        url: item.url,
        publishedAt: new Date(item.time * 1000),
        summary: item.text?.slice(0, 200),
        tags: inferTags(item.title),
      }))
  } catch (e) {
    console.warn("HN fetch failed", e)
    return []
  }
}

export async function fetchDevTo(limit = 20): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(`https://dev.to/api/articles?top=1&per_page=${limit}`, { next: { revalidate: 7200 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((a: any) => ({
      source: "dev.to",
      title: a.title,
      url: a.url,
      publishedAt: new Date(a.published_at),
      summary: a.description,
      tags: (a.tag_list && a.tag_list.length ? a.tag_list : inferTags(a.title)).slice(0, 3),
    }))
  } catch (e) {
    console.warn("dev.to fetch failed", e)
    return []
  }
}

export async function fetchRssFeed(feedUrl: string, sourceName: string, limit = 15): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      next: { revalidate: 7200 },
      headers: { "User-Agent": "FocusTrack/1.0" },
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Very simple RSS parser – extracts <item> blocks
    const items: RawNewsItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match
    let count = 0
    while ((match = itemRegex.exec(xml)) !== null && count < limit) {
      const itemContent = match[1]
      const getTag = (tag: string): string => {
        const r = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i")
        const m = itemContent.match(r)
        if (!m) return ""
        // Clean CDATA and HTML entities minimally
        let val = m[1].trim()
        val = val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
        val = val.replace(/<[^>]+>/g, "").trim() // strip inner tags for simplicity
        return val
      }

      const title = getTag("title")
      let link = getTag("link")
      // Some feeds have <link> with attributes, or <guid>
      if (!link) {
        const guid = getTag("guid")
        if (guid && guid.startsWith("http")) link = guid
      }
      const pubDateStr = getTag("pubDate") || getTag("published") || getTag("updated")
      const description = getTag("description") || getTag("content:encoded") || ""

      if (!title || !link) continue

      let publishedAt = new Date()
      if (pubDateStr) {
        const parsed = new Date(pubDateStr)
        if (!isNaN(parsed.getTime())) publishedAt = parsed
      }

      items.push({
        source: sourceName,
        title: title.slice(0, 200),
        url: link,
        publishedAt,
        summary: description.slice(0, 200),
        tags: inferTags(title),
      })
      count++
    }

    return items
  } catch (e) {
    console.warn(`RSS fetch failed for ${sourceName} ${feedUrl}`, e)
    return []
  }
}

export async function fetchAllNews(): Promise<RawNewsItem[]> {
  const [hn, devto, fcc, cssTricks, openAi] = await Promise.all([
    fetchHackerNews(20),
    fetchDevTo(20),
    fetchRssFeed("https://www.freecodecamp.org/news/rss/", "freeCodeCamp", 15),
    fetchRssFeed("https://css-tricks.com/feed/", "CSS-Tricks", 10),
    fetchRssFeed("https://www.artificialintelligence-news.com/feed/", "AI News", 10),
  ])

  const all = [...hn, ...devto, ...fcc, ...cssTricks, ...openAi]
  return deduplicateByUrl(all)
}

function inferTags(title: string): string[] {
  const lower = title.toLowerCase()
  const tags: string[] = []
  if (
    lower.includes("ai") ||
    lower.includes("llm") ||
    lower.includes("gpt") ||
    lower.includes("prompt") ||
    lower.includes("machine learning") ||
    lower.includes("openai") ||
    lower.includes("anthropic")
  )
    tags.push("AI")
  if (
    lower.includes("web") ||
    lower.includes("javascript") ||
    lower.includes("react") ||
    lower.includes("next") ||
    lower.includes("css") ||
    lower.includes("html") ||
    lower.includes("frontend") ||
    lower.includes("typescript")
  )
    tags.push("Web")
  if (
    lower.includes("algorithm") ||
    lower.includes("codeforces") ||
    lower.includes("leetcode") ||
    lower.includes("cp") ||
    lower.includes("data structure") ||
    lower.includes("competitive")
  )
    tags.push("CP/Algorithms")
  if (lower.includes("open source") || lower.includes("github") || lower.includes("oss")) tags.push("Open Source")
  if (tags.length === 0) tags.push("Web")
  return tags
}

export function deduplicateByUrl(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Map<string, RawNewsItem>()
  for (const item of items) {
    const normalizedUrl = item.url.split("?")[0].split("#")[0]
    if (!seen.has(item.url) && !seen.has(normalizedUrl)) {
      seen.set(item.url, item)
      seen.set(normalizedUrl, item)
    } else if (!seen.has(item.url)) {
      // Prefer first encountered
    }
  }
  // Use unique by url
  const unique = new Map<string, RawNewsItem>()
  for (const item of items) {
    if (!unique.has(item.url)) unique.set(item.url, item)
  }
  return Array.from(unique.values()).sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
}
