"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskForm } from "@/components/tasks/TaskForm"
import { CpLogForm } from "@/components/contests/CpLogForm"
import { AiReviewPanel } from "@/components/ai/AiReviewPanel"
import { ContestList } from "@/components/contests/ContestList"
import { useCreateTask, useUpdateTask, Task } from "@/hooks/use-tasks"
import { useAiReviewPanel } from "@/hooks/use-ai-review"
import { Plus } from "lucide-react"

export default function CpPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { output, isLoading, error, generate, fromCache } = useAiReviewPanel("CP")

  const handleCreate = async (data: any) => {
    await createTask.mutateAsync(data)
    setIsDialogOpen(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingTask) return
    await updateTask.mutateAsync({ id: editingTask.id, ...data })
    setEditingTask(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600 inline-block" /> Competitive Programming
          </h1>
          <p className="text-muted-foreground">Tasks • Quick-log • AI Analyser • Contests (CF + CC) • Best Time</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="cp">Phase 4 Live</Badge>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add CP Task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CP Tasks Board</CardTitle>
              <CardDescription>Drag & drop TODO ↔ DOING ↔ DONE • Optimistic • Search • Tags • Logs feed AI</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList track="CP" onEdit={(t) => setEditingTask(t)} />
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-3">AI Path Analyser – Is my path correct?</h2>
            <AiReviewPanel track="CP" output={output} isLoading={isLoading} error={error} onGenerate={(force) => generate(force)} fromCache={fromCache} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contests Panel – Upcoming & Running</CardTitle>
              <CardDescription>Codeforces + CodeChef • Sorted by start time • User timezone • Countdown • Add to Calendar • Remind me</CardDescription>
            </CardHeader>
            <CardContent>
              <ContestList />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <CpLogForm />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Best Time to Practice</CardTitle>
              <CardDescription className="text-xs">lib/analytics/best-time.ts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-sm font-medium">Default: 9 AM - 12 PM</p>
                <p className="text-[11px] text-muted-foreground mt-1">Collect 10+ FocusSessions + CpLogs to personalize.</p>
                <div className="mt-3 grid grid-cols-6 gap-1">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-3 rounded bg-background" style={{ opacity: 0.3 + Math.random() * 0.7 }} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-600/20">
            <CardHeader>
              <CardTitle className="text-sm">Phase 4 Done</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>✅ Codeforces API contest.list server-side</p>
              <p>✅ CodeChef primary + fallback kontests.net + clist.by behind interface</p>
              <p>✅ Normalize → Contest model, Redis cache 30 min, cron /api/cron/contests every 30 min, CRON_SECRET guarded, stale badge</p>
              <p>✅ Contests UI: timezone, countdown, duration, platform badge, open link noopener noreferrer, add to calendar (GCal + .ics), remind me (Web Notification + localStorage)</p>
              <p>✅ Upcoming + running sorted, filter ALL/CF/CC</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add CP Task</DialogTitle>
          </DialogHeader>
          <TaskForm defaultTrack="CP" onSubmit={handleCreate} onCancel={() => setIsDialogOpen(false)} isSubmitting={createTask.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && <TaskForm defaultTrack="CP" initialTask={editingTask} onSubmit={handleUpdate} onCancel={() => setEditingTask(null)} isSubmitting={updateTask.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
