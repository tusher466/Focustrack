"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, Loader2, Flame } from "lucide-react"

type Lesson = {
  id: string
  date: string
  level: number
  title: string
  concept: string
  badPromptExample: string
  goodPromptExample: string
  exercise: string
  buildChallenge: string
  completed: boolean
}

export function LessonCard({ lesson, onComplete, isCompleting, xpInfo }: { lesson: Lesson; onComplete: (id: string) => void; isCompleting?: boolean; xpInfo?: { level: number; xp: number; streak: number } }) {
  const levelLabels: Record<number, string> = {
    1: "L1 Beginner – clear task prompts",
    2: "L2 Context & constraints",
    3: "L3 Structured prompts (role/format/examples)",
    4: "L4 Debugging with AI",
    5: "L5 Architecture & planning prompts",
    6: "L6 Agents/workflows",
    7: "L7 Evaluation & prompt iteration",
  }

  return (
    <Card className={`border-purple-600/30 ${lesson.completed ? "bg-purple-50/50 dark:bg-purple-950/10" : ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="vibe">L{lesson.level}</Badge>
            <Badge variant="outline" className="text-[11px]">{levelLabels[lesson.level] || `Level ${lesson.level}`}</Badge>
            {lesson.completed && <Badge className="bg-emerald-600 text-white"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>}
          </div>
          {xpInfo && (
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> {xpInfo.streak} streak</span>
              <span>Lvl {xpInfo.level} • {xpInfo.xp} XP</span>
            </div>
          )}
        </div>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" /> {lesson.title}
        </CardTitle>
        <CardDescription>Auto-generated at local midnight • Stable all day • Date {new Date(lesson.date).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Concept</h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{lesson.concept}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-3">
            <h4 className="text-xs font-bold text-red-700 dark:text-red-300">❌ Bad Prompt Example</h4>
            <pre className="mt-2 text-xs whitespace-pre-wrap font-mono bg-white dark:bg-black/20 p-2 rounded border">{lesson.badPromptExample}</pre>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">✅ Good Prompt Example</h4>
            <pre className="mt-2 text-xs whitespace-pre-wrap font-mono bg-white dark:bg-black/20 p-2 rounded border">{lesson.goodPromptExample}</pre>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <h4 className="text-sm font-semibold">Exercise</h4>
          <p className="text-sm mt-1">{lesson.exercise}</p>
        </div>

        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-3">
          <h4 className="text-sm font-semibold flex items-center gap-1"><Sparkles className="h-4 w-4 text-purple-600" /> Build Challenge</h4>
          <p className="text-sm mt-1">{lesson.buildChallenge}</p>
        </div>

        {!lesson.completed ? (
          <Button onClick={() => onComplete(lesson.id)} disabled={isCompleting} className="w-full bg-purple-600 hover:bg-purple-700">
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Mark Complete + Earn XP ({20 + lesson.level * 10} XP)
          </Button>
        ) : (
          <div className="text-center text-sm text-emerald-600 font-medium flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" /> Completed! XP earned, streak updated.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
