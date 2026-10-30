"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Task = {
  id: string
  track: "CP" | "ACADEMIC" | "VIBE"
  title: string
  notes?: string | null
  status: "TODO" | "DOING" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueAt?: string | null
  estimateMin?: number | null
  tags: string[]
  createdAt: string
  completedAt?: string | null
  cpLogs?: any[]
}

async function fetchTasks(track?: string): Promise<Task[]> {
  const params = new URLSearchParams()
  if (track) params.set("track", track)
  const res = await fetch(`/api/tasks?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const data = await res.json()
  return data.tasks || []
}

export function useTasks(track?: "CP" | "ACADEMIC" | "VIBE") {
  return useQuery({
    queryKey: ["tasks", track],
    queryFn: () => fetchTasks(track),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ? JSON.stringify(err.error) : "Failed to create")
      }
      const data = await res.json()
      return data.task
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["tasks", variables.track] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed to update")
      const data = await res.json()
      return data.task as Task
    },
    onMutate: async ({ id, status }) => {
      // optimistic update for status change
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const prev = qc.getQueryData<Task[]>(["tasks"]) // may not have track variant, but we update all
      // Update all cached task queries
      qc.getQueryCache().findAll({ queryKey: ["tasks"] }).forEach((query) => {
        const data = query.state.data as Task[] | undefined
        if (!data) return
        qc.setQueryData(query.queryKey, data.map((t) => (t.id === id ? { ...t, status: status ?? t.status } : t)))
      })
      return { prev }
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev) qc.setQueryData(["tasks"], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
