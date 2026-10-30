"use client"
import { CalendarView } from "@/components/calendar/CalendarView"
import { Badge } from "@/components/ui/badge"

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Unified view: tasks with due dates, exams, study-plan items, contests, focus sessions. Month/week/day views, drag to reschedule tasks, colour by track.</p>
        </div>
        <Badge>Phase 6 Live</Badge>
      </div>
      <CalendarView />
    </div>
  )
}
