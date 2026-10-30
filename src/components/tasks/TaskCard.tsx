"use client"
import { Task } from "@/hooks/use-tasks"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Trash2, Edit, ExternalLink, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void; onStatusChange: (id: string, status: Task["status"]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const priorityColor = {
    LOW: "bg-gray-500",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    URGENT: "bg-red-600",
  }[task.priority]

  const trackVariant = {
    CP: "cp",
    ACADEMIC: "academic",
    VIBE: "vibe",
  }[task.track] as "cp" | "academic" | "vibe"

  return (
    <Card ref={setNodeRef} style={style} className={`group relative cursor-grab active:cursor-grabbing border-l-4 ${isDragging ? "shadow-xl z-10" : ""}`} {...attributes} {...listeners}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColor} rounded-l`} />
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight line-clamp-2 flex-1">{task.title}</h4>
          <Badge variant={trackVariant} className="shrink-0 text-[10px] px-1.5 py-0.5">
            {task.track}
          </Badge>
        </div>

        {task.notes && <p className="text-xs text-muted-foreground line-clamp-2">{task.notes}</p>}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {task.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {task.estimateMin && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {task.estimateMin}m
              </span>
            )}
            {task.dueAt && (
              <span className={`flex items-center gap-1 ${new Date(task.dueAt) < new Date() && task.status !== "DONE" ? "text-red-500 font-medium" : ""}`}>
                due {format(new Date(task.dueAt), "MMM d")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status !== "DONE" ? (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onStatusChange(task.id, "DONE")}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onStatusChange(task.id, "TODO")}>
                <Clock className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(task)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => onDelete(task.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground flex justify-between">
          <span>{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {task.priority}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
