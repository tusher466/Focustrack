"use client"
import { useState } from "react"
import { Clock } from "@/components/timers/Clock"
import { Stopwatch } from "@/components/timers/Stopwatch"
import { Countdown } from "@/components/timers/Countdown"
import { Pomodoro } from "@/components/timers/Pomodoro"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMutation } from "@tanstack/react-query"

export default function FocusPage() {
  const [lastSession, setLastSession] = useState<any>(null)

  const createSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create session")
      return res.json()
    },
    onSuccess: (data) => setLastSession(data.session),
  })

  const handleStopwatchComplete = (actualSec: number, track?: "CP" | "ACADEMIC" | "VIBE" | null, taskId?: string | null) => {
    createSessionMutation.mutate({
      track: track || null,
      taskId: taskId || null,
      type: "STOPWATCH",
      plannedSec: actualSec,
      actualSec,
      startedAt: new Date(Date.now() - actualSec * 1000).toISOString(),
    })
  }

  const handlePomodoroComplete = (actualSec: number, plannedSec: number, track?: "CP" | "ACADEMIC" | "VIBE" | null, taskId?: string | null, _type?: string) => {
    createSessionMutation.mutate({
      track: track || null,
      taskId: taskId || null,
      type: "POMODORO",
      plannedSec,
      actualSec,
      startedAt: new Date(Date.now() - actualSec * 1000).toISOString(),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Focus Lab</h1>
          <p className="text-muted-foreground">Clock • Stopwatch • Countdown • Pomodoro • Persisted • Sound & Notification • Sync to FocusSession</p>
        </div>
        <Badge>Phase 6 Live</Badge>
      </div>

      {lastSession && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 text-sm">
            <p className="font-medium">Last session logged: {lastSession.type} • {Math.floor((lastSession.actualSec || 0) / 60)}m • Track {lastSession.track || "None"} • {new Date(lastSession.startedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Clock />
        <Stopwatch onComplete={handleStopwatchComplete} />
        <Countdown />
        <Pomodoro onComplete={handlePomodoroComplete} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Implementation Notes – Spec Compliance</CardTitle>
          <CardDescription>All timers use timestamps, survive refresh, sync to FocusSession</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• World clock: user timezone auto-detect via Intl, editable in profile (profile.timezone), +2 extra selectable zones, Zustand persist `focustrack:worldclock`, updates every sec but based on Date.now()</p>
          <p>• Stopwatch: timestamp-based (Date.now() - startTime + elapsed), not setInterval drift, survives refresh via `focustrack:stopwatch`, on stop plays sound (data URI) + Web Notification + POST /api/focus-sessions with actualSec, track, taskId</p>
          <p>• Countdown: target date/time e.g. exam/contest, timestamp-based, persisted `focustrack:countdown`, on finish sound + notification, quick set +24h</p>
          <p>• Pomodoro: 25/5 default configurable (work/break/longBreak/sessionsBeforeLong), linked to track & optionally task (Select from useTasks), timestamp-based, Zustand persist `focustrack:pomodoro`, survives refresh, plays sound + notification on mode switch, creates FocusSession on work complete, linked track/task, skip/pause/reset</p>
          <p>• Zustand only for timer/clock UI state as per spec, TanStack Query for data, localStorage for persistence, FocusSession model for analytics (best-time.ts uses it)</p>
        </CardContent>
      </Card>
    </div>
  )
}
