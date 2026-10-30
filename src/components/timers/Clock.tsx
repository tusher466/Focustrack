"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorldClockStore } from "@/stores/timer-store"
import { useTimezone } from "@/hooks/use-timezone"
import { Clock as ClockIcon, Plus, X } from "lucide-react"

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

export function Clock() {
  const userTz = useTimezone()
  const { extraZones, addZone, removeZone } = useWorldClockStore()
  const [now, setNow] = useState(new Date())
  const [selectedTz, setSelectedTz] = useState<string>("")

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (tz: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(now)
    } catch {
      return now.toLocaleTimeString()
    }
  }

  const formatOffset = (tz: string) => {
    try {
      const formatter = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
      const parts = formatter.formatToParts(now)
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value || ""
      return tzName
    } catch {
      return ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClockIcon className="h-5 w-5" /> World Clock</CardTitle>
        <CardDescription>User timezone auto-detect + 2 extra zones selectable</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Your Timezone</p>
              <p className="text-2xl font-mono font-bold">{formatTime(userTz)}</p>
              <p className="text-xs opacity-80 mt-1">{userTz} {formatOffset(userTz)}</p>
            </div>
            <Badge variant="secondary" className="bg-white text-primary">Primary</Badge>
          </div>
        </div>

        <div className="grid gap-3">
          {extraZones.map((tz) => (
            <div key={tz} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{tz}</p>
                <p className="font-mono text-lg">{formatTime(tz)}</p>
                <p className="text-xs text-muted-foreground">{formatOffset(tz)}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeZone(tz)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Select value={selectedTz} onValueChange={setSelectedTz}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Add timezone" /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.filter((tz) => tz !== userTz && !extraZones.includes(tz)).map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { if (selectedTz) { addZone(selectedTz); setSelectedTz("") } }} disabled={!selectedTz}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        <p className="text-[11px] text-muted-foreground">Times stored UTC, displayed in user timezone. Timestamp-based, survives refresh via Zustand persist (localStorage). Auto-detect via Intl.</p>
      </CardContent>
    </Card>
  )
}
