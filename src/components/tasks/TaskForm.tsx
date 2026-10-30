"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Task } from "@/hooks/use-tasks"
import { Plus, Loader2 } from "lucide-react"

type Props = {
  defaultTrack?: "CP" | "ACADEMIC" | "VIBE"
  initialTask?: Task | null
  onSubmit: (data: any) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function TaskForm({ defaultTrack = "CP", initialTask, onSubmit, onCancel, isSubmitting }: Props) {
  const [track, setTrack] = useState<"CP" | "ACADEMIC" | "VIBE">(initialTask?.track || defaultTrack)
  const [title, setTitle] = useState(initialTask?.title || "")
  const [notes, setNotes] = useState(initialTask?.notes || "")
  const [priority, setPriority] = useState<Task["priority"]>(initialTask?.priority || "MEDIUM")
  const [status, setStatus] = useState<Task["status"]>(initialTask?.status || "TODO")
  const [estimateMin, setEstimateMin] = useState<string>(initialTask?.estimateMin?.toString() || "")
  const [dueAt, setDueAt] = useState<string>(initialTask?.dueAt ? new Date(initialTask.dueAt).toISOString().slice(0, 16) : "")
  const [tags, setTags] = useState<string>(initialTask?.tags?.join(", ") || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const payload: any = {
      track,
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      status,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    }

    if (estimateMin) payload.estimateMin = parseInt(estimateMin)
    if (dueAt) payload.dueAt = new Date(dueAt).toISOString()

    await onSubmit(payload)
    if (!initialTask) {
      setTitle("")
      setNotes("")
      setEstimateMin("")
      setTags("")
      setDueAt("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Track</Label>
          <Select value={track} onValueChange={(v: any) => setTrack(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CP">CP • Blue</SelectItem>
              <SelectItem value="ACADEMIC">Academic • Green</SelectItem>
              <SelectItem value="VIBE">Vibe • Purple</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Learn Binary Search - CSES & CP-Algos" required maxLength={200} />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details, links, checklist..." rows={3} maxLength={2000} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODO">TODO</SelectItem>
              <SelectItem value="DOING">DOING</SelectItem>
              <SelectItem value="DONE">DONE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Estimate (min)</Label>
          <Input type="number" min={1} max={1000} value={estimateMin} onChange={(e) => setEstimateMin(e.target.value)} placeholder="90" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Due at</Label>
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="binary-search, cses" />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {initialTask ? "Update Task" : "Add Task"}
        </Button>
      </div>
    </form>
  )
}
