"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { usePomodoroStore } from "@/stores/timer-store"
import { useTasks } from "@/hooks/use-tasks"
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee } from "lucide-react"

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function Pomodoro({ onComplete }: { onComplete?: (actualSec: number, plannedSec: number, track?: "CP" | "ACADEMIC" | "VIBE" | null, taskId?: string | null, type?: "POMODORO") => void }) {
  const {
    config,
    mode,
    isRunning,
    startTime,
    elapsedSec,
    sessionsCompleted,
    linkedTrack,
    linkedTaskId,
    setConfig,
    setLinkedTrack,
    setLinkedTask,
    start,
    pause,
    reset,
    skip,
  } = usePomodoroStore()

  const { data: tasks = [] } = useTasks(linkedTrack || undefined)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setNow(Date.now()), 200) // 200ms for smooth, but timestamp-based
    return () => clearInterval(id)
  }, [isRunning])

  // Compute live elapsed
  const liveElapsedSec = isRunning && startTime ? elapsedSec + Math.floor((now - startTime) / 1000) : elapsedSec
  const targetSec = mode === "work" ? config.workSec : mode === "break" ? config.breakSec : config.longBreakSec
  const remainingSec = Math.max(0, targetSec - liveElapsedSec)
  const progressPct = targetSec > 0 ? (liveElapsedSec / targetSec) * 100 : 0

  // Auto-complete when reaches 0
  useEffect(() => {
    if (remainingSec === 0 && isRunning) {
      // Complete session
      const { nextMode } = usePomodoroStore.getState().completeSession()
      // Play sound + notification
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAACAAP//AP//AP//AP//AP//AP//AP//AP//AAD//wAA//8AAP//AAD//wAA//8AAP8A/wD/AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP8A/wD/AP8A/wD/AP//AP//AP//AP8A")
        audio.play().catch(() => {})
      } catch {}
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Pomodoro ${mode} finished`, { body: `Next: ${nextMode} • Sessions: ${sessionsCompleted + (mode === "work" ? 1 : 0)}` })
        }
      } catch {}

      // Sync to FocusSession if work session completed
      if (mode === "work") {
        onComplete?.(targetSec, targetSec, linkedTrack || undefined, linkedTaskId || undefined, "POMODORO")
      }
    }
  }, [remainingSec, isRunning, mode, targetSec, sessionsCompleted, linkedTrack, linkedTaskId, onComplete])

  const modeLabel = mode === "work" ? "Focus" : mode === "break" ? "Break" : "Long Break"
  const modeColor = mode === "work" ? "bg-primary text-primary-foreground" : mode === "break" ? "bg-emerald-600 text-white" : "bg-purple-600 text-white"

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Pomodoro {mode === "work" ? <Timer className="h-4 w-4" /> : <Coffee className="h-4 w-4" />} {modeLabel}</CardTitle>
        <CardDescription>25/5 default configurable, linked to track & task, timestamp-based, survives refresh, sound + notification, sync to FocusSession</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center text-3xl font-mono font-bold ${modeColor}`}>{formatSec(remainingSec)}</div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${mode === "work" ? "bg-primary" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, progressPct)}%` }} />
          </div>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">{modeLabel}</Badge>
            <Badge variant="secondary">{sessionsCompleted} sessions</Badge>
            <Badge variant={isRunning ? "default" : "secondary"}>{isRunning ? "Running" : "Paused"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {!isRunning ? (
            <Button onClick={start} className="col-span-2"><Play className="h-4 w-4 mr-2" /> Start</Button>
          ) : (
            <Button onClick={pause} variant="secondary" className="col-span-2"><Pause className="h-4 w-4 mr-2" /> Pause</Button>
          )}
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={skip}><SkipForward className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Work (min)</Label>
            <Input type="number" min={1} max={120} value={Math.floor(config.workSec / 60)} onChange={(e) => setConfig({ workSec: Math.max(60, parseInt(e.target.value || "0") * 60) })} />
          </div>
          <div>
            <Label className="text-xs">Break (min)</Label>
            <Input type="number" min={1} max={30} value={Math.floor(config.breakSec / 60)} onChange={(e) => setConfig({ breakSec: Math.max(60, parseInt(e.target.value || "0") * 60) })} />
          </div>
          <div>
            <Label className="text-xs">Long (min)</Label>
            <Input type="number" min={1} max={60} value={Math.floor(config.longBreakSec / 60)} onChange={(e) => setConfig({ longBreakSec: Math.max(60, parseInt(e.target.value || "0") * 60) })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Linked Track</Label>
            <Select value={linkedTrack || ""} onValueChange={(v: any) => setLinkedTrack(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="CP">CP (blue)</SelectItem>
                <SelectItem value="ACADEMIC">Academic (green)</SelectItem>
                <SelectItem value="VIBE">Vibe (purple)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Linked Task</Label>
            <Select value={linkedTaskId || ""} onValueChange={(v: any) => setLinkedTask(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {tasks.slice(0, 20).map((t) => <SelectItem key={t.id} value={t.id}>{t.title.slice(0, 30)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">Uses timestamps (Date.now() - startTime) not setInterval drift. Persisted in localStorage `focustrack:pomodoro`. Survives refresh. On work complete → FocusSession POST with track/task, sound + Web Notification. Configurable 25/5 default.</p>
      </CardContent>
    </Card>
  )
}
