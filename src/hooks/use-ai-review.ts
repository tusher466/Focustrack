"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

type Track = "CP" | "ACADEMIC" | "VIBE"

async function fetchLatestReview(track: Track) {
  const res = await fetch(`/api/ai/review?track=${track}`)
  if (!res.ok) throw new Error("Failed to fetch reviews")
  const data = await res.json()
  return data.reviews?.[0] || null
}

async function generateReview(track: Track, force = false) {
  const res = await fetch("/api/ai/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track, force }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Generation failed")
  return json
}

export function useLatestAiReview(track: Track) {
  return useQuery({
    queryKey: ["ai-review", track],
    queryFn: () => fetchLatestReview(track),
  })
}

export function useGenerateAiReview(track: Track) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (force: boolean = false) => {
      return generateReview(track, force)
    },
    onSuccess: (data) => {
      qc.setQueryData(["ai-review", track], { output: data.output, createdAt: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ["ai-review"] })
      qc.setQueryData(["ai-review-result", track], data)
    },
  })
}

// Combined hook for panel
export function useAiReviewPanel(track: Track) {
  const latest = useLatestAiReview(track)
  const generateMut = useGenerateAiReview(track)

  const currentOutput = generateMut.data?.output || latest.data?.output || null
  const fromCache = generateMut.data?.fromCache || false

  const generate = (force = false) => {
    generateMut.mutate(force)
  }

  return {
    output: currentOutput,
    isLoading: latest.isLoading || generateMut.isPending,
    error: (latest.error as any)?.message || (generateMut.error as any)?.message || null,
    generate,
    latest,
    generateState: generateMut,
    fromCache,
    hasExisting: !!latest.data,
  }
}
