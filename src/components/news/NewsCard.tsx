"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Bookmark, BookmarkCheck, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type NewsItem = {
  source: string
  title: string
  url: string
  publishedAt: string | Date
  summary?: string
  tags: string[]
  isBookmarked?: boolean
}

export function NewsCard({ item, onToggleBookmark }: { item: NewsItem; onToggleBookmark?: (url: string, isBookmarked: boolean) => void }) {
  const published = new Date(item.publishedAt)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px]">{item.source}</Badge>
              {item.tags.map((tag) => (
                <Badge key={tag} variant={tag === "AI" ? "secondary" : tag === "CP/Algorithms" ? "cp" : tag === "Web" ? "academic" : "vibe"} className="text-[10px]">{tag}</Badge>
              ))}
            </div>
            <h4 className="font-semibold text-sm mt-2 leading-tight line-clamp-2">{item.title}</h4>
            {item.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(published, { addSuffix: true })}</span>
              <span>• {published.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Read Original
            </a>
          </Button>
          <Button
            size="sm"
            variant={item.isBookmarked ? "default" : "outline"}
            onClick={() => onToggleBookmark?.(item.url, !!item.isBookmarked)}
            title={item.isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {item.isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
