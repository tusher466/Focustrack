"use client"
import { useState, useMemo } from "react"
import { useContests, useSyncContests } from "@/hooks/use-contests"
import { ContestCard } from "./ContestCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Trophy, Clock, AlertTriangle } from "lucide-react"

export function ContestList() {
  const { data, isLoading, error, refetch } = useContests()
  const syncMutation = useSyncContests()
  const [filter, setFilter] = useState<"ALL" | "CODEFORCES" | "CODECHEF">("ALL")

  const contests = data?.contests || []
  const meta = data?.meta

  const filtered = useMemo(() => {
    if (filter === "ALL") return contests
    return contests.filter((c) => c.platform === filter)
  }, [contests, filter])

  const upcoming = filtered.filter((c) => new Date(c.startTime) > new Date())
  const running = filtered.filter((c) => c.phase === "CODING" || (new Date(c.startTime) <= new Date() && new Date(new Date(c.startTime).getTime() + c.durationSec * 1000) > new Date()))

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm text-red-600">Failed to load contests</CardTitle>
          <CardDescription>{String(error)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Contests</h3>
          <Badge variant="outline">{meta?.count || contests.length} total</Badge>
          {meta?.isStale && <Badge variant="destructive" className="text-[11px]"><AlertTriangle className="h-3 w-3 mr-1" /> stale – fallback data</Badge>}
          {meta?.source && <Badge variant="secondary" className="text-[10px]">source: {meta.source}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button size="sm" variant={filter === "ALL" ? "default" : "outline"} onClick={() => setFilter("ALL")}>All</Button>
            <Button size="sm" variant={filter === "CODEFORCES" ? "default" : "outline"} onClick={() => setFilter("CODEFORCES")}>CF</Button>
            <Button size="sm" variant={filter === "CODECHEF" ? "default" : "outline"} onClick={() => setFilter("CODECHEF")}>CC</Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} title="Refresh from cache/DB">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} title="Force sync via cron (requires CRON_SECRET in dev allowed)">
            {syncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Sync"}
          </Button>
        </div>
      </div>

      {meta?.lastUpdated && <p className="text-[11px] text-muted-foreground">Last updated: {new Date(meta.lastUpdated).toLocaleString()} • Cron every 30 min → /api/cron/contests</p>}

      {running.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Clock className="h-4 w-4 text-emerald-600" /> Running Now ({running.length})</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {running.map((c) => <ContestCard key={`${c.platform}-${c.externalId}`} contest={c} isStale={meta?.isStale} />)}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Upcoming ({upcoming.length})</h4>
        {upcoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">No upcoming contests found. {meta?.isStale ? "Data is stale – both Codeforces and CodeChef sources failed, serving cached/DB fallback." : "Try syncing."}</CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {upcoming.map((c) => <ContestCard key={`${c.platform}-${c.externalId}`} contest={c} isStale={meta?.isStale} />)}
          </div>
        )}
      </div>

      {contests.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-[11px] text-muted-foreground space-y-1">
            <p>• Sorted by start time, displayed in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
            <p>• Duration, countdown, platform badge, open contest in new tab (noopener noreferrer)</p>
            <p>• Add to Calendar: Google Calendar + .ics download, Remind me: Web Notification 10 min before + localStorage</p>
            <p>• Data sources: Codeforces official API (contest.list) server-side, CodeChef primary (codechef.com/api/list/contests/all) + fallback kontests.net + clist.by, normalized into Contest model, cached Redis 30 min, cron /api/cron/contests, stale badge if both fail</p>
            <p>• Requests: Vercel Cron → /api/cron/* secured by CRON_SECRET (Bearer or x-cron-secret or query), fetch → normalize → upsert DB → invalidate Redis</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
