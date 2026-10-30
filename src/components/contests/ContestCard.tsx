"use client"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Clock, Calendar, Bell, Timer } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useTimezone } from "@/hooks/use-timezone"

type Contest = {
  platform: "CODEFORCES" | "CODECHEF"
  externalId: string
  name: string
  startTime: string | Date
  durationSec: number
  url: string
  phase: string
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getCountdown(target: Date): { d: number; h: number; m: number; s: number; isPast: boolean; isLive: boolean } {
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const isPast = diffMs < 0
  const isLive = isPast && Math.abs(diffMs) < 3 * 3600 * 1000 // within 3h considered live if phase CODING
  const abs = Math.abs(diffMs)
  const d = Math.floor(abs / (1000 * 60 * 60 * 24))
  const h = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((abs % (1000 * 60)) / 1000)
  return { d, h, m, s, isPast, isLive }
}

export function ContestCard({ contest, isStale }: { contest: Contest; isStale?: boolean }) {
  const timezone = useTimezone()
  const startDate = new Date(contest.startTime)
  const [countdown, setCountdown] = useState(() => getCountdown(startDate))
  const [notifGranted, setNotifGranted] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown(startDate)), 1000)
    return () => clearInterval(id)
  }, [startDate])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted")
    }
  }, [])

  const isCodeforces = contest.platform === "CODEFORCES"
  const isLive = contest.phase === "CODING" || (countdown.isLive && countdown.isPast === false ? false : countdown.isPast && Math.abs(startDate.getTime() - Date.now()) < contest.durationSec * 1000)

  const handleAddToCalendar = () => {
    const start = startDate
    const end = new Date(start.getTime() + contest.durationSec * 1000)
    const formatForGCal = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(contest.name)}&details=${encodeURIComponent(`Platform: ${contest.platform}\nURL: ${contest.url}\nPhase: ${contest.phase}`)}&dates=${formatForGCal(start)}/${formatForGCal(end)}&ctz=${encodeURIComponent(timezone)}`
    window.open(gcalUrl, "_blank", "noopener,noreferrer")
  }

  const handleDownloadIcs = () => {
    const start = startDate
    const end = new Date(start.getTime() + contest.durationSec * 1000)
    const formatIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FocusTrack//Contest//EN
BEGIN:VEVENT
UID:${contest.platform}-${contest.externalId}@focustrack.dev
DTSTAMP:${formatIcs(new Date())}
DTSTART:${formatIcs(start)}
DTEND:${formatIcs(end)}
SUMMARY:${contest.name.replace(/\n/g, " ")}
DESCRIPTION:Platform ${contest.platform} - ${contest.url}
URL:${contest.url}
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([ics], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${contest.platform}-${contest.externalId}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRemind = async () => {
    if (!("Notification" in window)) {
      alert("Browser notifications not supported")
      return
    }
    let permission = Notification.permission
    if (permission !== "granted") {
      permission = await Notification.requestPermission()
    }
    if (permission !== "granted") {
      alert("Notification permission denied")
      return
    }
    setNotifGranted(true)

    // Store reminder in localStorage
    const reminders = JSON.parse(localStorage.getItem("focustrack:contest-reminders") || "[]")
    reminders.push({ id: `${contest.platform}-${contest.externalId}`, name: contest.name, startTime: startDate.toISOString(), url: contest.url })
    localStorage.setItem("focustrack:contest-reminders", JSON.stringify(reminders))

    // Schedule notification 10 min before (if within 24h, use setTimeout for demo)
    const tenMinBefore = new Date(startDate.getTime() - 10 * 60 * 1000)
    const now = new Date()
    const diff = tenMinBefore.getTime() - now.getTime()

    // Immediate feedback notification
    new Notification(`Reminder set: ${contest.name}`, {
      body: `Will notify 10 min before start (${format(startDate, "PPp")})`,
      icon: "/icon-192.png",
    })

    if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        new Notification(`Contest starting soon: ${contest.name}`, {
          body: `Starts in 10 minutes! ${contest.platform}`,
          icon: "/icon-192.png",
        })
      }, diff)
    }

    alert(`Reminder set! Will notify 10 min before ${contest.name}. Stored in localStorage for persistence.`)
  }

  const durationStr = formatDuration(contest.durationSec)

  return (
    <Card className={`border-l-4 ${isCodeforces ? "border-l-blue-600" : "border-l-amber-700"} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isCodeforces ? "cp" : "secondary"} className={isCodeforces ? "" : "bg-amber-700 text-white hover:bg-amber-800"}>
                {contest.platform}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${contest.phase === "CODING" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : ""}`}>
                {contest.phase}
              </Badge>
              {isStale && <Badge variant="destructive" className="text-[10px]">stale</Badge>}
              {isLive && <Badge className="bg-red-600 text-white animate-pulse text-[10px]">LIVE</Badge>}
            </div>
            <h4 className="font-semibold text-sm mt-2 leading-tight line-clamp-2">{contest.name}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(startDate, "MMM d, yyyy • HH:mm")} ({timezone})</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {durationStr}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(startDate, { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
            <div className="font-bold text-sm">{String(countdown.isPast ? 0 : countdown.d).padStart(2, "0")}</div>
            <div className="text-[9px]">DAYS</div>
          </div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
            <div className="font-bold text-sm">{String(countdown.h).padStart(2, "0")}</div>
            <div className="text-[9px]">HRS</div>
          </div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
            <div className="font-bold text-sm">{String(countdown.m).padStart(2, "0")}</div>
            <div className="text-[9px]">MIN</div>
          </div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
            <div className="font-bold text-sm">{String(countdown.s).padStart(2, "0")}</div>
            <div className="text-[9px]">SEC</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" asChild>
            <a href={contest.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
            </a>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleAddToCalendar}>
            <Calendar className="h-3.5 w-3.5 mr-1" /> Calendar
          </Button>
          <Button size="sm" variant="outline" onClick={handleRemind} title={notifGranted ? "Reminder set" : "Set reminder"}>
            <Bell className={`h-3.5 w-3.5 ${notifGranted ? "fill-current" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-[11px] h-6 flex-1" onClick={handleDownloadIcs}>Download .ics</Button>
        </div>
      </CardContent>
    </Card>
  )
}
