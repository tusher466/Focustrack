"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export function ResourceList({ resources }: { resources: { title: string; url: string; type: string; why: string }[] }) {
  if (!resources || resources.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Recommended Resources</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {resources.map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex gap-2 text-xs border rounded p-2 hover:bg-accent">
            <div className="flex-1">
              <p className="font-medium flex items-center gap-1">{r.title} <ExternalLink className="h-3 w-3" /></p>
              <p className="text-muted-foreground">{r.why} • {r.type}</p>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  )
}
