// Computes best time to practice from FocusSession + CpProblemLog

export interface SessionSample {
  startedAt: Date
  actualSec?: number | null
  result?: "SOLVED" | "PARTIAL" | "FAILED" | "EDITORIAL_USED"
  timeSpentMin?: number | null
}

export interface HourStats {
  hour: number // 0-23
  count: number
  avgSolveRate: number
  avgDurationMin: number
  score: number // combined
}

export function computeBestTime(samples: SessionSample[], minSamples = 10): { heatmap: HourStats[]; recommendation: string; personalized: boolean } {
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: [] as SessionSample[],
  }))

  for (const s of samples) {
    const h = s.startedAt.getHours()
    hourBuckets[h].sessions.push(s)
  }

  const heatmap: HourStats[] = hourBuckets.map((b) => {
    const count = b.sessions.length
    const solved = b.sessions.filter((ss) => ss.result === "SOLVED").length
    const avgSolveRate = count ? solved / count : 0
    const totalMin = b.sessions.reduce((sum, ss) => sum + (ss.actualSec ? ss.actualSec / 60 : ss.timeSpentMin || 0), 0)
    const avgDurationMin = count ? totalMin / count : 0
    // Score: weighted - higher count & solve rate better, but also reasonable duration
    const score = count * 0.4 + avgSolveRate * 50 + (avgDurationMin > 0 ? Math.min(avgDurationMin / 60, 1) * 10 : 0)
    return { hour: b.hour, count, avgSolveRate, avgDurationMin, score }
  })

  const totalSamples = samples.length
  if (totalSamples < minSamples) {
    return {
      heatmap,
      recommendation: "Default window: 9 AM - 12 PM is generally productive for deep work. Collect 10+ sessions to get personalized recommendation.",
      personalized: false,
    }
  }

  // Find best 3-hour window
  let bestWindowScore = -1
  let bestStart = 9
  for (let start = 0; start < 24; start++) {
    let windowScore = 0
    for (let offset = 0; offset < 3; offset++) {
      const h = (start + offset) % 24
      windowScore += heatmap[h].score
    }
    if (windowScore > bestWindowScore) {
      bestWindowScore = windowScore
      bestStart = start
    }
  }

  const end = (bestStart + 3) % 24
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM"
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display} ${ampm}`
  }

  return {
    heatmap,
    recommendation: `Personalized best window: ${formatHour(bestStart)} - ${formatHour(end)} based on ${totalSamples} sessions. Your solve rate peaks then.`,
    personalized: true,
  }
}
