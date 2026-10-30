"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useCountdownStore } from "@/stores/timer-store"
import { Calendar, Bell, X } from "lucide-react"

function getRemaining(target: Date) {
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  const isPast = diff <= 0
  const abs = Math.abs(diff)
  const d = Math.floor(abs / (1000 * 60 * 60 * 24))
  const h = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((abs % (1000 * 60)) / 1000)
  return { d, h, m, s, isPast, diff }
}

export function Countdown() {
  const { target, label, setTarget, clear } = useCountdownStore()
  const [now, setNow] = useState(new Date())
  const [inputDate, setInputDate] = useState("")
  const [inputLabel, setInputLabel] = useState("")

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const targetDate = target ? new Date(target) : null
  const remaining = targetDate ? getRemaining(targetDate) : null

  useEffect(() => {
    if (remaining && remaining.isPast && remaining.diff > -1000 && remaining.diff <= 0) {
      // Just completed – sound + notification
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAACAAP//AP//AP//AP//AP//AP//AP//AP//AAD//wAA//8AAP//AAD//wAA//8AAP8A/wD/AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP8A/wD/AP8A/wD/AP//AP//AP//AP8A")
        audio.play().catch(() => {})
      } catch {}
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Countdown finished: ${label}`, { body: `${label} reached at ${new Date().toLocaleString()}` })
        }
      } catch {}
    }
  }, [remaining?.isPast, remaining?.diff, label])

  const handleSet = () => {
    if (!inputDate) return
    const iso = new Date(inputDate).toISOString()
    setTarget(iso, inputLabel || "Custom Countdown")
    setInputDate("")
  }

  const handleQuickSet = (type: "exam" | "contest") => {
    // Example: set to exam date from DB – for demo set to tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    setTarget(tomorrow.toISOString(), type === "exam" ? "Exam Countdown" : "Contest Countdown")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Countdown</CardTitle>
        <CardDescription>Target date/time e.g. exam or contest • Timestamp-based, survives refresh, sound + notification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {targetDate && remaining ? (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{targetDate.toLocaleString()} • {remaining.isPast ? "Passed" : "Upcoming"}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className={`rounded p-2 ${remaining.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <div className="font-bold text-lg">{remaining.d}</div><div className="text-[10px]">DAYS</div>
              </div>
              <div className={`rounded p-2 ${remaining.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <div className="font-bold text-lg">{remaining.h}</div><div className="text-[10px]">HRS</div>
              </div>
              <div className={`rounded p-2 ${remaining.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <div className="font-bold text-lg">{remaining.m}</div><div className="text-[10px]">MIN</div>
              </div>
              <div className={`rounded p-2 ${remaining.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <div className="font-bold text-lg">{remaining.s}</div><div className="text-[10px]">SEC</div>
              </div>
            </div>
            {remaining.isPast ? <Badge variant="destructive" className="w-full justify-center">Time&apos;s up!</Badge> : <Badge variant="secondary" className="w-full justify-center">Counting down</Badge>}
            <Button variant="outline" size="sm" className="w-full" onClick={clear}><X className="h-4 w-4 mr-2" /> Clear</Button>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded">No countdown set</div>
        )}

        <div className="space-y-2">
          <Label>Set target (exam/contest)</Label>
          <Input type="datetime-local" value={inputDate} onChange={(e) => setInputDate(e.target.value)} />
          <Input placeholder="Label e.g. OS Exam" value={inputLabel} onChange={(e) => setInputLabel(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSet} disabled={!inputDate}>Set Countdown</Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickSet("exam")}>Quick: +24h Exam</Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickSet("contest")}>Contest</Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">Persisted localStorage `focustrack:countdown`. Uses timestamp drift-free. On finish plays sound + Web Notification.</p>
      </CardContent>
    </Card>
  )
}
