export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000] // XP needed for level 1..7 etc

export function getLevelFromXp(xp: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

export function xpToNextLevel(currentXp: number): { currentLevel: number; nextThreshold: number; progressPct: number } {
  const currentLevel = getLevelFromXp(currentXp)
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 1.5
  const prevThreshold = LEVEL_THRESHOLDS[currentLevel - 1] ?? 0
  const range = nextThreshold - prevThreshold
  const progress = range > 0 ? ((currentXp - prevThreshold) / range) * 100 : 100
  return { currentLevel, nextThreshold, progressPct: Math.min(100, Math.max(0, progress)) }
}
