"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Profile = {
  id: string
  displayName?: string | null
  bio?: string | null
  avatar?: string | null
  timezone: string
  codeforcesHandle?: string | null
  codechefHandle?: string | null
  goals?: any
  weeklyTargetHours: number
  user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  progress: { track: "CP" | "ACADEMIC" | "VIBE"; xp: number; level: number; streakDays: number; lastActiveDate?: string | null }[]
}

async function fetchProfile(): Promise<Profile | null> {
  const res = await fetch("/api/profile")
  if (!res.ok) throw new Error("Failed")
  const data = await res.json()
  return data.profile || null
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  })
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/export")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })
}
