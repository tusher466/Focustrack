export function calculateStreak(lastActiveDate: Date | null, today: Date = new Date()): { newStreak: number; isContinuation: boolean } {
  if (!lastActiveDate) return { newStreak: 1, isContinuation: false }
  const last = new Date(lastActiveDate)
  last.setHours(0, 0, 0, 0)
  const cur = new Date(today)
  cur.setHours(0, 0, 0, 0)
  const diffDays = Math.round((cur.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return { newStreak: 0, isContinuation: true } // same day
  if (diffDays === 1) return { newStreak: 1, isContinuation: true } // continuation, caller adds
  return { newStreak: 1, isContinuation: false } // broken
}
