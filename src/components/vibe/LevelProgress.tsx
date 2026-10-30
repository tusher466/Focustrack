"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Flame, Trophy, Star } from "lucide-react"
import { LEVEL_THRESHOLDS, xpToNextLevel } from "@/lib/gamification/levels"

export function LevelProgress({ xp, level, streakDays, track }: { xp: number; level: number; streakDays: number; track?: string }) {
  const { nextThreshold, progressPct } = xpToNextLevel(xp)
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0

  const levelNames: Record<number, string> = {
    1: "Beginner",
    2: "Context & constraints",
    3: "Structured prompts",
    4: "Debugging with AI",
    5: "Architecture & planning",
    6: "Agents/workflows",
    7: "Evaluation & iteration",
    8: "Master",
  }

  return (
    <Card className="border-purple-600/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-purple-600" /> {track || "VIBE"} • Level {level} – {levelNames[level] || `Level ${level}`}</span>
          <Badge variant="vibe"> {xp} XP</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progress to L{level + 1}</span>
            <span>{currentThreshold} → {nextThreshold} XP • {Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1 rounded bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-2 py-1">
            <Flame className="h-3 w-3" /> {streakDays} day streak
          </div>
          <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
            <Star className="h-3 w-3" /> {level >= 7 ? "Max level" : `${nextThreshold - xp} XP to next`}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2">
          {LEVEL_THRESHOLDS.slice(0, 7).map((th, i) => (
            <div key={i} className={`h-2 rounded ${i + 1 <= level ? "bg-purple-600" : "bg-muted"}`} title={`L${i + 1}: ${th} XP`} />
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground">Levels: L1 Clear tasks → L2 Context → L3 Structured → L4 Debug → L5 Arch → L6 Agents → L7 Eval. Completing lesson + exercise gives XP; level-up when threshold reached. Track streaks.</div>
      </CardContent>
    </Card>
  )
}

// Simple Progress component if not exists
