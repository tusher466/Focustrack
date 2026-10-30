"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

type Lesson = {
  id: string
  date: string
  level: number
  title: string
  concept: string
  badPromptExample: string
  goodPromptExample: string
  exercise: string
  buildChallenge: string
  completed: boolean
}

async function fetchLesson(): Promise<{ lesson: Lesson | null; isNew: boolean; dateStr: string; timezone: string }> {
  const res = await fetch("/api/ai/lesson")
  if (!res.ok) throw new Error("Failed to fetch lesson")
  return res.json()
}

export function useDailyLesson() {
  return useQuery({ queryKey: ["vibe-lesson"], queryFn: fetchLesson })
}

export function useCompleteLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch("/api/ai/lesson", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId }) })
      if (!res.ok) throw new Error("Failed to complete")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibe-lesson"] })
      qc.invalidateQueries({ queryKey: ["user-progress"] })
    },
  })
}

type PromptLibraryItem = {
  id: string
  title: string
  prompt: string
  rating?: "WORKED" | "DIDNT_WORK" | null
  notes?: string | null
  tags: string[]
  createdAt: string
}

async function fetchPromptLibrary(): Promise<PromptLibraryItem[]> {
  const res = await fetch("/api/prompt-library")
  if (!res.ok) throw new Error("Failed")
  const data = await res.json()
  return data.prompts || []
}

export function usePromptLibrary() {
  return useQuery({ queryKey: ["prompt-library"], queryFn: fetchPromptLibrary })
}

export function useCreatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/prompt-library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompt-library"] }),
  })
}

export function useUpdatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/prompt-library/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompt-library"] }),
  })
}

export function useDeletePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prompt-library/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompt-library"] }),
  })
}

export function usePromptReviewer() {
  return useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetch("/api/ai/prompt-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      return json
    },
  })
}
