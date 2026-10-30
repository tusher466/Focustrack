"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStopwatchStore } from "@/stores/timer-store"
import { Play, Pause, RotateCcw, Timer as TimerIcon } from "lucide-react"

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const msRem = Math.floor((ms % 1000) / 10)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msRem).padStart(2, "0")}`
}

export function Stopwatch({ onComplete }: { onComplete?: (actualSec: number, track?: "CP" | "ACADEMIC" | "VIBE", taskId?: string) => void }) {
  const { isRunning, startTime, elapsedMs, start, stop, reset } = useStopwatchStore()
  const [displayMs, setDisplayMs] = useState(elapsedMs)
  const [track, setTrack] = useState<"CP" | "ACADEMIC" | "VIBE" | "">("")
  const [taskId, setTaskId] = useState("")

  useEffect(() => {
    if (!isRunning || !startTime) {
      setDisplayMs(elapsedMs)
      return
    }
    const id = setInterval(() => {
      const now = Date.now()
      setDisplayMs(elapsedMs + (now - startTime))
    }, 50) // 50ms for smooth display, but based on timestamp drift-free
    return () => clearInterval(id)
  }, [isRunning, startTime, elapsedMs])

  useEffect(() => {
    // Sync display when not running
    if (!isRunning) setDisplayMs(elapsedMs)
  }, [elapsedMs, isRunning])

  const handleStop = async () => {
    stop()
    const totalMs = displayMs
    const actualSec = Math.round(totalMs / 1000)
    if (actualSec > 0) {
      // Play sound + notification
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAACAAP//AP//AP//AP//AP//AP//AP//AP//AAD//wAA//8AAP//AAD//wAA//8AAP8A/wD/AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP8A/wD/AP8A/wD/AP//AP//AP//AP8A")
        audio.play().catch(() => {})
      } catch {}
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Stopwatch completed", { body: `Focused ${formatMs(totalMs)}` })
        }
      } catch {}
      // Sync to FocusSession via parent callback
      onComplete?.(actualSec, (track as any) || undefined, taskId || undefined)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TimerIcon className="h-5 w-5" /> Stopwatch</CardTitle>
        <CardDescription>Timestamp-based, survives refresh (Zustand persist), sync to FocusSession on stop, sound + notification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="font-mono text-4xl font-bold tracking-tight">{formatMs(displayMs)}</div>
          <Badge variant={isRunning ? "default" : "secondary"} className="mt-2">{isRunning ? "Running" : "Stopped"}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {!isRunning ? (
            <Button onClick={start} className="col-span-2"><Play className="h-4 w-4 mr-2" /> Start</Button>
          ) : (
            <Button onClick={handleStop} variant="secondary" className="col-span-2"><Pause className="h-4 w-4 mr-2" /> Stop & Log</Button>
          )}
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium">Track (optional)</label>
            <Select value={track} onValueChange={(v: any) => setTrack(v)}>
              <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="VIBE">Vibe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Task ID (optional)</label>
            <input className="flex h-10 w-full rounded-md border px-3 text-sm" value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="task_abc" />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">Uses Date.now() timestamps, not setInterval drift. Persisted in localStorage `focustrack:stopwatch`. On stop, creates FocusSession via API.</p>
      </CardContent>
    </Card>
  )
}
