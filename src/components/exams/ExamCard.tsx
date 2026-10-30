"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Target, BookOpen, Trash2 } from "lucide-react"

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = target.getTime() - now.getTime()
  const isPast = diff <= 0
  const abs = Math.abs(diff)
  return {
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((abs % (1000 * 60)) / 1000),
    isPast,
  }
}

export function ExamCard({ exam, onDelete, onSelect }: { exam: { id: string; subject: string; examDate: string; syllabusTopics: any[]; targetScore?: number | null }; onDelete?: (id: string) => void; onSelect?: (id: string) => void }) {
  const countdown = useCountdown(new Date(exam.examDate))
  const topicsCount = Array.isArray(exam.syllabusTopics) ? exam.syllabusTopics.length : 0
  const weakCount = Array.isArray(exam.syllabusTopics) ? exam.syllabusTopics.filter((t: any) => t.confidence <= 2).length : 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> {exam.subject}</CardTitle>
          <Badge variant={countdown.isPast ? "destructive" : countdown.days <= 3 ? "destructive" : "secondary"}>{countdown.isPast ? "Past" : `${countdown.days}d left`}</Badge>
        </div>
        <CardDescription>{new Date(exam.examDate).toLocaleString()} • {topicsCount} topics • {weakCount} weak (≤2)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}><div className="font-bold">{countdown.days}</div><div className="text-[10px]">DAYS</div></div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}><div className="font-bold">{countdown.hours}</div><div className="text-[10px]">HRS</div></div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}><div className="font-bold">{countdown.minutes}</div><div className="text-[10px]">MIN</div></div>
          <div className={`rounded p-1.5 ${countdown.isPast ? "bg-muted" : "bg-primary text-primary-foreground"}`}><div className="font-bold">{countdown.seconds}</div><div className="text-[10px]">SEC</div></div>
        </div>

        {exam.targetScore && <div className="flex items-center gap-1 text-xs"><Target className="h-3 w-3" /> Target: {exam.targetScore}</div>}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onSelect?.(exam.id)}>View Study Plan</Button>
          <Button size="sm" variant="outline" onClick={() => onDelete?.(exam.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
