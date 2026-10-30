import { describe, it, expect } from "vitest"
import { calculateXpForTaskCompletion, xpForLesson, xpForPromptReview } from "@/lib/gamification/xp"
import { getLevelFromXp, xpToNextLevel, LEVEL_THRESHOLDS } from "@/lib/gamification/levels"
import { calculateStreak } from "@/lib/gamification/streaks"
import { computeBestTime } from "@/lib/analytics/best-time"

describe("gamification xp", () => {
  it("calculates XP for task completion by priority", () => {
    expect(calculateXpForTaskCompletion("LOW")).toBe(5)
    expect(calculateXpForTaskCompletion("MEDIUM")).toBe(10)
    expect(calculateXpForTaskCompletion("HIGH")).toBe(20)
    expect(calculateXpForTaskCompletion("URGENT")).toBe(30)
    expect(calculateXpForTaskCompletion("MEDIUM", 120)).toBe(20) // 10 +10 for long estimate
    expect(calculateXpForTaskCompletion("MEDIUM", 90)).toBe(15)
  })

  it("xp for lesson scales with level", () => {
    expect(xpForLesson(1)).toBe(30)
    expect(xpForLesson(3)).toBe(50)
    expect(xpForLesson(7)).toBe(90)
  })

  it("xp for prompt review equals score", () => {
    expect(xpForPromptReview(7)).toBe(7)
  })
})

describe("levels", () => {
  it("gets level from xp", () => {
    expect(getLevelFromXp(0)).toBe(1)
    expect(getLevelFromXp(50)).toBe(1)
    expect(getLevelFromXp(100)).toBe(2)
    expect(getLevelFromXp(300)).toBe(3)
    expect(getLevelFromXp(3000)).toBe(8)
  })

  it("calculates progress to next level", () => {
    const { currentLevel, nextThreshold, progressPct } = xpToNextLevel(150)
    expect(currentLevel).toBe(2)
    expect(nextThreshold).toBe(300)
    expect(progressPct).toBeGreaterThan(0)
    expect(progressPct).toBeLessThanOrEqual(100)
  })

  it("thresholds are increasing", () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1])
    }
  })
})

describe("streaks", () => {
  it("starts new streak when no last date", () => {
    const { newStreak } = calculateStreak(null)
    expect(newStreak).toBe(1)
  })

  it("continues streak when last date was yesterday", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const { isContinuation } = calculateStreak(yesterday, new Date())
    expect(isContinuation).toBe(true)
  })

  it("breaks streak when gap >1 day", () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 3)
    const { isContinuation } = calculateStreak(twoDaysAgo)
    expect(isContinuation).toBe(false)
  })
})

describe("best-time analytics", () => {
  it("returns default when insufficient samples", () => {
    const result = computeBestTime([], 10)
    expect(result.personalized).toBe(false)
    expect(result.recommendation).toContain("Default")
    expect(result.heatmap.length).toBe(24)
  })

  it("personalizes after 10 samples", () => {
    const samples = Array.from({ length: 12 }).map((_, i) => ({
      startedAt: new Date(new Date().setHours(9 + (i % 3))),
      actualSec: 1800,
      result: "SOLVED" as const,
      timeSpentMin: 30,
    }))
    const result = computeBestTime(samples, 10)
    expect(result.personalized).toBe(true)
    expect(result.recommendation).toContain("Personalized best window")
  })

  it("computes hour stats", () => {
    const samples = [
      { startedAt: new Date(new Date().setHours(9)), actualSec: 1800, result: "SOLVED" as const },
      { startedAt: new Date(new Date().setHours(9)), actualSec: 3600, result: "SOLVED" as const },
      { startedAt: new Date(new Date().setHours(22)), actualSec: 600, result: "FAILED" as const },
    ]
    const { heatmap } = computeBestTime(samples, 2)
    const hour9 = heatmap.find((h) => h.hour === 9)!
    const hour22 = heatmap.find((h) => h.hour === 22)!
    expect(hour9.count).toBe(2)
    expect(hour9.avgSolveRate).toBe(1)
    expect(hour22.avgSolveRate).toBe(0)
  })
})
