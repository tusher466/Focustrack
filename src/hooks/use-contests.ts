"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Contest = {
  platform: "CODEFORCES" | "CODECHEF"
  externalId: string
  name: string
  startTime: string | Date
  durationSec: number
  url: string
  phase: string
}

type ContestsResponse = {
  contests: Contest[]
  meta: {
    source: "cache" | "db" | "stale" | "error"
    isStale: boolean
    lastUpdated?: string
    count: number
  }
}

async function fetchContests(): Promise<ContestsResponse> {
  const res = await fetch("/api/contests")
  if (!res.ok) throw new Error("Failed to fetch contests")
  return res.json()
}

export function useContests() {
  return useQuery({
    queryKey: ["contests"],
    queryFn: fetchContests,
    staleTime: 1000 * 60 * 10, // 10 min
    refetchOnWindowFocus: false,
  })
}

export function useSyncContests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/contests", { headers: { "x-cron-secret": process.env.NEXT_PUBLIC_CRON_SECRET || "" } }).catch(() => fetch("/api/cron/contests"))
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Sync failed")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contests"] })
    },
  })
}
