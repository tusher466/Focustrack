"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Exam = {
  id: string
  subject: string
  examDate: string
  syllabusTopics: { topic: string; confidence: number; status: "TODO" | "DOING" | "DONE" }[]
  targetScore?: number | null
  items: { id: string; date: string; topic: string; durationMin: number; done: boolean }[]
  mockTests: { id: string; date: string; score: number; total: number; notes?: string | null }[]
  createdAt: string
}

async function fetchExams(): Promise<Exam[]> {
  const res = await fetch("/api/exams")
  if (!res.ok) throw new Error("Failed to fetch exams")
  const data = await res.json()
  return data.exams || []
}

export function useExams() {
  return useQuery({ queryKey: ["exams"], queryFn: fetchExams })
}

export function useCreateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { subject: string; examDate: string; syllabusTopics: any[]; targetScore?: number }) => {
      const res = await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed to create exam")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  })
}

export function useGenerateStudyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, availableHoursPerDay }: { examId: string; availableHoursPerDay: number }) => {
      const res = await fetch(`/api/exams/${examId}/study-plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ availableHoursPerDay }) })
      if (!res.ok) throw new Error("Failed to generate plan")
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["exams"] })
      qc.invalidateQueries({ queryKey: ["study-plan", vars.examId] })
    },
  })
}

export function useToggleStudyPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, itemId, done }: { examId: string; itemId: string; done: boolean }) => {
      const res = await fetch(`/api/exams/${examId}/study-plan`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, done }) })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  })
}

export function useCreateMockTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, date, score, total, notes }: { examId: string; date: string; score: number; total?: number; notes?: string }) => {
      const res = await fetch(`/api/exams/${examId}/mock-tests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, score, total, notes }) })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  })
}
