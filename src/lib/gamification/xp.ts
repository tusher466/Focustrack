export function calculateXpForTaskCompletion(priority: string, estimateMin?: number): number {
  const base = { LOW: 5, MEDIUM: 10, HIGH: 20, URGENT: 30 } as Record<string, number>
  let xp = base[priority] ?? 10
  if (estimateMin) {
    if (estimateMin >= 120) xp += 10
    else if (estimateMin >= 60) xp += 5
  }
  return xp
}

export function xpForLesson(level: number): number {
  return 20 + level * 10
}

export function xpForPromptReview(score: number): number {
  return Math.round(score)
}
