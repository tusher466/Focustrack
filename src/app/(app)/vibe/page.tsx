"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskForm } from "@/components/tasks/TaskForm"
import { useCreateTask, useUpdateTask, Task } from "@/hooks/use-tasks"
import { useDailyLesson, useCompleteLesson } from "@/hooks/use-vibe"
import { LessonCard } from "@/components/vibe/LessonCard"
import { LevelProgress } from "@/components/vibe/LevelProgress"
import { PromptReviewer } from "@/components/vibe/PromptReviewer"
import { PromptLibrary } from "@/components/vibe/PromptLibrary"
import { Plus, Sparkles, Loader2 } from "lucide-react"

export default function VibePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const { data: lessonData, isLoading: lessonLoading, error: lessonError, refetch: refetchLesson } = useDailyLesson()
  const completeLesson = useCompleteLesson()

  const lesson = lessonData?.lesson || null
  const [progress, setProgress] = useState<{ level: number; xp: number; streak: number } | null>(null)

  // For progress display, we could fetch user progress via API, but for Phase5 we use lesson level as placeholder
  // In complete mutation response we get progress
  const handleComplete = async (id: string) => {
    try {
      const result = await completeLesson.mutateAsync(id)
      setProgress({ level: result.progress.level, xp: result.progress.xp, streak: result.streakDays })
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-600 inline-block" /> Vibe Coding & Prompting
          </h1>
          <p className="text-muted-foreground">Daily lessons • Levels L1-L7 • XP • Prompt Library • AI Reviewer • Build Challenges</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="vibe">Phase 5 Live</Badge>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Vibe Task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Lesson */}
          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600" /> Today&apos;s Lesson – Auto-generated at local midnight, stable all day</h2>
            {lessonLoading ? (
              <Card><CardContent className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /><p className="text-sm mt-2">Generating today&apos;s lesson...</p></CardContent></Card>
            ) : lessonError ? (
              <Card className="border-red-200"><CardContent className="p-4 text-sm text-red-600">{String(lessonError)} <Button size="sm" variant="outline" className="ml-2" onClick={() => refetchLesson()}>Retry</Button></CardContent></Card>
            ) : lesson ? (
              <LessonCard lesson={lesson as any} onComplete={handleComplete} isCompleting={completeLesson.isPending} xpInfo={progress ? progress : undefined} />
            ) : (
              <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">No lesson today yet. It will be auto-generated at your local midnight and stored stable all day. Click generate.</CardContent></Card>
            )}
            {completeLesson.data && (
              <Card className="mt-3 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">🎉 Completed! +{completeLesson.data.xpGain} XP</p>
                  {completeLesson.data.leveledUp && <p className="text-emerald-700">Level Up! Now Level {completeLesson.data.progress.level}</p>}
                  <p className="text-xs text-muted-foreground">Next threshold: {completeLesson.data.nextThreshold} XP • {Math.round(completeLesson.data.progressPct)}% progress • Streak: {completeLesson.data.streakDays} days</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" /> Vibe Tasks Board</CardTitle>
              <CardDescription>Tasks for lessons • Build challenges • Prompting practice</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList track="VIBE" onEdit={(t) => setEditingTask(t)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LevelProgress xp={progress?.xp || 120} level={progress?.level || 2} streakDays={progress?.streak || 5} track="VIBE" />

          <PromptReviewer />

          <Card className="border-purple-600/20">
            <CardHeader>
              <CardTitle className="text-sm">Levels L1-L7 System</CardTitle>
              <CardDescription className="text-xs">Content difficulty follows user level</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-1 text-muted-foreground">
              <p><span className="font-bold">L1</span> Beginner – clear task prompts</p>
              <p><span className="font-bold">L2</span> Context & constraints</p>
              <p><span className="font-bold">L3</span> Structured (role/format/examples)</p>
              <p><span className="font-bold">L4</span> Debugging with AI</p>
              <p><span className="font-bold">L5</span> Architecture & planning</p>
              <p><span className="font-bold">L6</span> Agents/workflows</p>
              <p><span className="font-bold">L7</span> Evaluation & iteration</p>
              <p className="pt-2">XP thresholds: 0,100,300,600,1000,1500,2200,3000. Completing lesson + exercise gives 20+level*10 XP.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cron – Daily Lesson at 00:05 local</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>• Vercel Cron hits /api/cron/daily-lesson at 00:05 UTC daily</p>
              <p>• Loop over users, compute today in their timezone (profile.timezone), generate if missing via AI (provider-agnostic, cached 10 min, rate limited)</p>
              <p>• Also GET /api/ai/lesson generates on-demand if no lesson for today – stable all day</p>
              <p>• Stored in PromptLesson unique(userId,date), completed boolean, XP on complete</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PromptLibrary />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How Vibe Fits FocusTrack</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• Daily lesson auto-generated at user&apos;s local midnight, stored stable all day, difficulty follows level</p>
            <p>• Each lesson: concept, bad vs good prompt, exercise, build challenge</p>
            <p>• Level system L1-L7, XP thresholds, streaks, level-up</p>
            <p>• Prompt Library: save prompts with rating worked/didn&apos;t work + notes, tags, +3 XP on save</p>
            <p>• Prompt Reviewer: paste prompt → score /10 + improvements + rewritten version, Zod validated, cached, rate limited, +2 XP</p>
            <p>• All AI validated via Zod, retry repair, provider-agnostic, never exposes keys</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vibe Task</DialogTitle>
          </DialogHeader>
          <TaskForm defaultTrack="VIBE" onSubmit={async (data) => { await createTask.mutateAsync(data); setIsDialogOpen(false) }} onCancel={() => setIsDialogOpen(false)} isSubmitting={createTask.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vibe Task</DialogTitle>
          </DialogHeader>
          {editingTask && <TaskForm defaultTrack="VIBE" initialTask={editingTask} onSubmit={async (data) => { await updateTask.mutateAsync({ id: editingTask.id, ...data }); setEditingTask(null) }} onCancel={() => setEditingTask(null)} isSubmitting={updateTask.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
