"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskForm } from "@/components/tasks/TaskForm"
import { AiReviewPanel } from "@/components/ai/AiReviewPanel"
import { useCreateTask, useUpdateTask, Task } from "@/hooks/use-tasks"
import { useAiReviewPanel } from "@/hooks/use-ai-review"
import { Plus } from "lucide-react"

export default function AcademicPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { output, isLoading, error, generate, fromCache } = useAiReviewPanel("ACADEMIC")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600 inline-block" /> Academic Track
          </h1>
          <p className="text-muted-foreground">Subjects • Deadlines • AI Academic Guide • Overload Detection</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="academic">Phase 3 Live</Badge>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Academic Task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Tasks Board</CardTitle>
              <CardDescription>Subject, chapter, deadline, priority, estimate, tags • Drag & drop • Overload detection in AI</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList track="ACADEMIC" onEdit={(t) => setEditingTask(t)} />
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-3">AI Academic Guide – Workload & Plan</h2>
            <AiReviewPanel track="ACADEMIC" output={output} isLoading={isLoading} error={error} onGenerate={(force) => generate(force)} fromCache={fromCache} />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-emerald-600/20">
            <CardHeader>
              <CardTitle className="text-sm">Academic Guide Logic</CardTitle>
              <CardDescription className="text-xs">Phase 3 implemented</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <p>✅ Input: tasks, deadlines, exams, completion history, weeklyTargetHours</p>
              <p>✅ Detects deadline conflicts (&gt;1 task same day)</p>
              <p>✅ Overload: sum estimateMin next 7d &gt; weeklyTargetHours*60 warns</p>
              <p>✅ Output: workloadAssessment, prioritisedPlan, studyTechniques with THIS subject application, risks, weeklySchedule</p>
              <p>✅ Techniques: active recall, spaced repetition, Feynman – applied specifically</p>
              <p>✅ Caching 10 min, rate limit 20/day per track</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Exam Integration Preview</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <p className="text-muted-foreground">Exams pulled from DB for guide: subject, date, syllabus with confidence 1-5. Create exams in Phase 7 UI, but AI already uses them if present.</p>
              <div className="rounded border p-2">
                <p className="font-medium">OS: Deadlocks Ch4 – due Fri</p>
                <p className="text-muted-foreground">Notes: Banker algorithm, flashcards, 60m • Priority HIGH</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Academic Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            defaultTrack="ACADEMIC"
            onSubmit={async (data) => {
              await createTask.mutateAsync(data)
              setIsDialogOpen(false)
            }}
            onCancel={() => setIsDialogOpen(false)}
            isSubmitting={createTask.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Academic Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              defaultTrack="ACADEMIC"
              initialTask={editingTask}
              onSubmit={async (data) => {
                await updateTask.mutateAsync({ id: editingTask.id, ...data })
                setEditingTask(null)
              }}
              onCancel={() => setEditingTask(null)}
              isSubmitting={updateTask.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
