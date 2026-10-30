"use client"
import { useState, useMemo } from "react"
import { useTasks, useUpdateTask, useDeleteTask, Task } from "@/hooks/use-tasks"
import { TaskCard } from "./TaskCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Columns } from "lucide-react"
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"

const COLUMNS: { id: Task["status"]; label: string; color: string }[] = [
  { id: "TODO", label: "TODO", color: "border-gray-500" },
  { id: "DOING", label: "DOING", color: "border-yellow-500" },
  { id: "DONE", label: "DONE", color: "border-emerald-500" },
]

export function TaskList({ track, onEdit }: { track?: "CP" | "ACADEMIC" | "VIBE"; onEdit: (t: Task) => void }) {
  const { data: tasks = [], isLoading } = useTasks(track)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filtered = useMemo(() => {
    if (!search) return tasks
    const lower = search.toLowerCase()
    return tasks.filter((t) => t.title.toLowerCase().includes(lower) || t.notes?.toLowerCase().includes(lower) || t.tags.some((tag) => tag.toLowerCase().includes(lower)))
  }, [tasks, search])

  const grouped = useMemo(() => {
    return {
      TODO: filtered.filter((t) => t.status === "TODO"),
      DOING: filtered.filter((t) => t.status === "DOING"),
      DONE: filtered.filter((t) => t.status === "DONE"),
    }
  }, [filtered])

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    // Determine new status: if over id is a column id (TODO/DOING/DONE) or another task, find its status
    let newStatus: Task["status"] | null = null

    // over.id could be column id if dropping on empty column
    if (["TODO", "DOING", "DONE"].includes(over.id as string)) {
      newStatus = over.id as Task["status"]
    } else {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) newStatus = overTask.status
    }

    if (newStatus && newStatus !== activeTask.status) {
      await updateTask.mutateAsync({ id: activeTask.id, status: newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className="space-y-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks, tags, notes..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Columns className="h-4 w-4" /> Drag & drop between columns
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.id} className={`rounded-lg border-2 border-dashed ${col.color} bg-muted/10 min-h-[300px] flex flex-col`}>
              <div className="p-3 border-b bg-card rounded-t-lg flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {col.label}
                  <Badge variant="secondary" className="text-[11px]">{grouped[col.id].length}</Badge>
                </h3>
              </div>

              <SortableContext id={col.id} items={grouped[col.id].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="p-2 space-y-2 flex-1">
                  {grouped[col.id].length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center text-xs text-muted-foreground">
                        No tasks in {col.label}
                        <br />
                        Drag here or create new
                      </CardContent>
                    </Card>
                  ) : (
                    grouped[col.id].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                        onDelete={(id) => deleteTask.mutate(id)}
                        onStatusChange={(id, status) => updateTask.mutate({ id, status })}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 shadow-xl">
              <Card className="w-[300px]">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{activeTask.title}</p>
                  <p className="text-xs text-muted-foreground">{activeTask.track}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
