"use client"
import { useTasks } from "@/hooks/use-tasks"
import { useContests } from "@/hooks/use-contests"
import { useDailyLesson } from "@/hooks/use-vibe"
import { useExams } from "@/hooks/use-exams"
import { useProfile } from "@/hooks/use-profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Code2, GraduationCap, Sparkles, Clock, Flame, BookOpen, Calendar, Timer, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return <span className="text-emerald-600 font-bold">LIVE / Due</span>
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return <span className="font-mono">{d}d {h}h {m}m</span>
}

async function fetchFocusSessions() {
  const res = await fetch("/api/focus-sessions")
  if (!res.ok) return []
  const json = await res.json()
  return json.sessions || []
}

export default function DashboardPage() {
  const { data: allTasks = [], isLoading } = useTasks()
  const { data: contestsData } = useContests()
  const { data: lessonData } = useDailyLesson()
  const { data: exams = [] } = useExams()
  const { data: profile } = useProfile()
  const { data: sessions = [] } = useQuery({ queryKey: ["focus-sessions"], queryFn: fetchFocusSessions })

  const contests = contestsData?.contests || []
  const nextContest = contests.filter((c) => new Date(c.startTime) > new Date()).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]

  const stats = useMemo(() => {
    const cp = allTasks.filter((t) => t.track === "CP")
    const academic = allTasks.filter((t) => t.track === "ACADEMIC")
    const vibe = allTasks.filter((t) => t.track === "VIBE")
    const todo = allTasks.filter((t) => t.status === "TODO").length
    const doing = allTasks.filter((t) => t.status === "DOING").length
    const done = allTasks.filter((t) => t.status === "DONE").length
    const today = allTasks.filter((t) => {
      if (!t.dueAt) return false
      const due = new Date(t.dueAt)
      const now = new Date()
      return due.toDateString() === now.toDateString()
    })
    return { cp, academic, vibe, todo, doing, done, today, total: allTasks.length }
  }, [allTasks])

  const weeklyHours = useMemo(() => {
    // Calculate last 7 days focus hours from sessions
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      date.setHours(0, 0, 0, 0)
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      const daySessions = sessions.filter((s: any) => {
        const sd = new Date(s.startedAt)
        return sd >= date && sd < next
      })
      const totalSec = daySessions.reduce((sum: number, s: any) => sum + (s.actualSec || s.plannedSec || 0), 0)
      return { date: date.toLocaleDateString("en", { weekday: "short" }), hours: Math.round((totalSec / 3600) * 10) / 10, sessions: daySessions.length }
    })
    const total = days.reduce((sum, d) => sum + d.hours, 0)
    return { days, total }
  }, [sessions])

  const lesson = lessonData?.lesson

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Today&apos;s focus • {new Date().toLocaleDateString()} • {stats.total} tasks • {profile?.weeklyTargetHours || 10}h weekly target • {weeklyHours.total}h this week</p>
        </div>
        <div className="flex gap-2">
          <Link href="/cp"><Button variant="outline" size="sm"><Code2 className="h-4 w-4 mr-1" /> CP</Button></Link>
          <Link href="/academic"><Button variant="outline" size="sm"><GraduationCap className="h-4 w-4 mr-1" /> Acad</Button></Link>
          <Link href="/vibe"><Button variant="outline" size="sm"><Sparkles className="h-4 w-4 mr-1" /> Vibe</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-600/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CP Track</CardTitle>
            <Code2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cp.length} tasks</div>
            <p className="text-xs text-muted-foreground">{stats.cp.filter((t) => t.status === "DONE").length} done • Level {profile?.progress?.find((p) => p.track === "CP")?.level || 1} • {profile?.progress?.find((p) => p.track === "CP")?.xp || 0} XP</p>
            <div className="mt-3 h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${stats.cp.length ? (stats.cp.filter((t) => t.status === "DONE").length / stats.cp.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-600/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Academic</CardTitle>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.academic.length} tasks</div>
            <p className="text-xs text-muted-foreground">{stats.academic.filter((t) => t.status === "DONE").length} done • Level {profile?.progress?.find((p) => p.track === "ACADEMIC")?.level || 1} • {profile?.progress?.find((p) => p.track === "ACADEMIC")?.xp || 0} XP</p>
            <div className="mt-3 h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${stats.academic.length ? (stats.academic.filter((t) => t.status === "DONE").length / stats.academic.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-600/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vibe Coding</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vibe.length} tasks</div>
            <p className="text-xs text-muted-foreground">{stats.vibe.filter((t) => t.status === "DONE").length} done • Level {profile?.progress?.find((p) => p.track === "VIBE")?.level || 1} • {profile?.progress?.find((p) => p.track === "VIBE")?.xp || 0} XP • {profile?.progress?.find((p) => p.track === "VIBE")?.streakDays || 0}🔥</p>
            <div className="mt-3 h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-purple-600" style={{ width: `${stats.vibe.length ? (stats.vibe.filter((t) => t.status === "DONE").length / stats.vibe.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Focus</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyHours.total}h</div>
            <p className="text-xs text-muted-foreground">This week • Target {profile?.weeklyTargetHours || 10}h • {sessions.length} sessions</p>
            <div className="mt-3 flex gap-1 h-8 items-end">
              {weeklyHours.days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary rounded-sm" style={{ height: `${Math.min(100, (d.hours / 4) * 100)}%`, minHeight: d.hours > 0 ? "4px" : "2px", opacity: 0.3 + (d.hours / 4) * 0.7 }} />
                  <span className="text-[9px]">{d.date[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today&apos;s Tasks</CardTitle>
                <CardDescription>Across all tracks • {isLoading ? "Loading..." : `${allTasks.length} tasks`} • {stats.today.length} due today</CardDescription>
              </div>
              <Badge variant="secondary">{stats.todo} TODO / {stats.doing} DOING / {stats.done} DONE</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? <p className="text-sm text-muted-foreground">Loading tasks...</p> : allTasks.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No tasks yet – add in CP/Academic/Vibe</p>
              </div>
            ) : (
              allTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Badge variant={task.track === "CP" ? "cp" : task.track === "ACADEMIC" ? "academic" : "vibe"} className="text-[10px]">{task.track}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.status} • {task.priority} • {task.estimateMin ? `${task.estimateMin}m` : "no est"} • {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "no due"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Next Contest {contestsData?.meta.isStale && <Badge variant="destructive" className="text-[10px]">stale</Badge>}</CardTitle>
            </CardHeader>
            <CardContent>
              {nextContest ? (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">{nextContest.name}</p>
                  <p className="text-xs text-muted-foreground">{nextContest.platform} • {Math.floor(nextContest.durationSec / 3600)}h {Math.floor((nextContest.durationSec % 3600) / 60)}m • Starts in <Countdown target={new Date(nextContest.startTime)} /></p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" asChild><a href={nextContest.url} target="_blank" rel="noopener noreferrer">Open</a></Button>
                    <Link href="/cp" className="flex-1"><Button size="sm" variant="outline" className="w-full">View All</Button></Link>
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">No upcoming contests. Check /cp Contests Panel.</p>}
            </CardContent>
          </Card>

          {lesson && (
            <Card className="border-purple-600/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" /> Today&apos;s Lesson</CardTitle>
                <CardDescription className="text-xs">{lesson.title} • L{lesson.level}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs line-clamp-3">{lesson.concept.slice(0, 120)}...</p>
                <div className="flex gap-2">
                  <Link href="/vibe" className="flex-1"><Button size="sm" className="w-full">Open Lesson</Button></Link>
                  <Badge variant={lesson.completed ? "secondary" : "outline"} className="text-[10px]">{lesson.completed ? "Done" : "Todo"}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Exam Countdowns ({exams.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {exams.length === 0 ? <p className="text-xs text-muted-foreground">No exams. Create in /exams</p> : exams.slice(0, 3).map((exam) => (
                <div key={exam.id} className="flex justify-between items-center text-xs border rounded p-2">
                  <div><p className="font-medium">{exam.subject}</p><p className="text-[11px] text-muted-foreground">{new Date(exam.examDate).toLocaleDateString()}</p></div>
                  <Countdown target={new Date(exam.examDate)} />
                </div>
              ))}
              <Link href="/exams"><Button size="sm" variant="outline" className="w-full mt-2">View All Exams</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Current Streaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile?.progress?.map((p) => (
              <div key={p.track} className="flex justify-between text-sm border rounded p-2">
                <span>{p.track}</span><span className="flex items-center gap-2"><Flame className="h-3 w-3 text-orange-500" /> {p.streakDays} days • Lv {p.level} • {p.xp} XP</span>
              </div>
            )) || <p className="text-xs text-muted-foreground">No progress yet – complete tasks/lessons to build streak</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Weekly Review</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Weekly focus hours chart (last 7 days) from FocusSessions – shows daily hours, total {weeklyHours.total}h vs target {profile?.weeklyTargetHours || 10}h</p>
            <p>• Track XP bars (CP blue, Academic green, Vibe purple) with done %</p>
            <p>• Today&apos;s tasks across tracks, today due {stats.today.length}</p>
            <p>• Next contest real from /api/contests (cache 30min), countdown in user timezone {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            <p>• Today&apos;s lesson card from /api/ai/lesson – stable all day, L{lesson?.level || "?"}</p>
            <p>• Exam countdowns from /api/exams – shows days left, target score</p>
            <p>• Profile: {profile?.displayName || "User"} • {profile?.timezone} • {profile?.codeforcesHandle || "No CF handle"} • Export JSON available</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
