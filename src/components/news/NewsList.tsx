"use client"
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { NewsCard } from "./NewsCard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Bookmark, Filter } from "lucide-react"

type NewsItem = {
  source: string
  title: string
  url: string
  publishedAt: string
  summary?: string
  tags: string[]
  isBookmarked?: boolean
}

const FILTERS = ["All", "AI", "Web", "CP/Algorithms", "Open Source"] as const

async function fetchNews(tag?: string, bookmarked = false): Promise<{ news: NewsItem[]; meta: any }> {
  const params = new URLSearchParams()
  if (tag && tag !== "All") params.set("tag", tag)
  if (bookmarked) params.set("bookmarked", "true")
  const res = await fetch(`/api/news?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to fetch news")
  return res.json()
}

export function NewsList() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All")
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["news", activeFilter, showBookmarkedOnly],
    queryFn: () => fetchNews(activeFilter, showBookmarkedOnly),
    staleTime: 1000 * 60 * 10,
  })

  const qc = useQueryClient()

  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ url, isBookmarked, title, source }: { url: string; isBookmarked: boolean; title?: string; source?: string }) => {
      if (isBookmarked) {
        const res = await fetch(`/api/news/bookmarks?url=${encodeURIComponent(url)}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to remove bookmark")
        return { url, bookmarked: false }
      } else {
        const res = await fetch("/api/news/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title, source }) })
        if (!res.ok) throw new Error("Failed to bookmark")
        return { url, bookmarked: true }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news"] })
    },
  })

  const news = data?.news || []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Tech News</h3>
          <Badge variant="outline">{meta?.total || news.length} total • {meta?.count || 0} filtered</Badge>
          {meta?.isStale && <Badge variant="destructive" className="text-[10px]">stale – cached</Badge>}
          {meta?.source && <Badge variant="secondary" className="text-[10px]">source: {meta.source}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" variant={showBookmarkedOnly ? "default" : "outline"} onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}><Bookmark className="h-3.5 w-3.5 mr-1" /> Bookmarks</Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={activeFilter === f ? "default" : "outline"} className="h-7 text-xs" onClick={() => setActiveFilter(f)}>
            <Filter className="h-3 w-3 mr-1" /> {f}
          </Button>
        ))}
      </div>

      {meta?.lastUpdated && <p className="text-[11px] text-muted-foreground">Last updated: {new Date(meta.lastUpdated).toLocaleString()} • Cron every 2 hours → /api/cron/news • Deduplicated by URL, no full-article copying, link to original</p>}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : error ? (
        <Card className="border-red-200"><CardContent className="p-4 text-sm text-red-600">Failed to load news: {String(error)} <Button size="sm" variant="outline" className="ml-2" onClick={() => refetch()}>Retry</Button></CardContent></Card>
      ) : news.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No news for filter {activeFilter} {showBookmarkedOnly ? "with bookmarks" : ""}. Try different filter or bookmark some items. If both HN and dev.to and RSS fail, serves last cached data with stale badge.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {news.map((item) => (
            <NewsCard
              key={item.url}
              item={item}
              onToggleBookmark={(url, isBookmarked) => toggleBookmarkMutation.mutate({ url, isBookmarked, title: item.title, source: item.source })}
            />
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-3 text-[11px] text-muted-foreground space-y-1">
          <p>• Aggregates Hacker News API (topstories), dev.to API (top 1), plus 3 RSS feeds (freeCodeCamp, CSS-Tricks, AI News) – total 5 sources, deduplicates by URL (normalized without ?#), shows title, source, time, tags, link to original (no full copying)</p>
          <p>• Filter chips: AI, Web, CP/Algorithms, Open Source – inferred via keywords, bookmark items via NewsBookmark unique(userId,newsItemId)</p>
          <p>• Cached Redis 2 hours, cron /api/cron/news every 2 hours secured by CRON_SECRET, stale badge if both sources fail, serves last cached + DB fallback</p>
          <p>• Requests: Vercel Cron → /api/cron/news → fetchAllNews → deduplicate → upsert NewsItem (unique url) → cache</p>
        </CardContent>
      </Card>
    </div>
  )
}
