"use client"
import { NewsList } from "@/components/news/NewsList"
import { Badge } from "@/components/ui/badge"

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Tech News</h1>
          <p className="text-muted-foreground">Hacker News + dev.to + RSS (freeCodeCamp, CSS-Tricks, AI News) • Deduplicated • Filter chips • Bookmarks</p>
        </div>
        <Badge>Phase 8 Live</Badge>
      </div>
      <NewsList />
    </div>
  )
}
