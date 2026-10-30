import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateWithValidation } from "@/lib/ai/review"
import { DAILY_LESSON_PROMPT } from "@/lib/ai/prompts"
import { DailyLessonOutputSchema } from "@/lib/ai/schemas"
import { setCached } from "@/lib/redis"

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV !== "production") return true
    return false
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${cronSecret}`) return true
  const xCron = req.headers.get("x-cron-secret")
  if (xCron === cronSecret) return true
  return false
}

function getTodayDateInTimezone(timezone: string): { dateStr: string; dateObj: Date } {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" })
    const dateStr = formatter.format(new Date())
    return { dateStr, dateObj: new Date(dateStr + "T00:00:00.000Z") }
  } catch {
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]
    return { dateStr, dateObj: new Date(dateStr + "T00:00:00.000Z") }
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Generate lessons for all users that don't have one today in their timezone
  // In production, you would iterate users. For simplicity, generate for demo + recent active users
  try {
    const users = await db.user.findMany({ take: 100, include: { profile: true } })
    let generated = 0
    let skipped = 0
    const errors: string[] = []

    for (const user of users) {
      try {
        const timezone = user.profile?.timezone || "UTC"
        const { dateObj, dateStr } = getTodayDateInTimezone(timezone)

        const existing = await db.promptLesson.findUnique({ where: { userId_date: { userId: user.id, date: dateObj } } })
        if (existing) {
          skipped++
          continue
        }

        const progress = await db.userProgress.findUnique({ where: { userId_track: { userId: user.id, track: "VIBE" } } })
        const level = progress?.level || 1

        const recentTasks = await db.task.findMany({ where: { userId: user.id, track: "VIBE" }, orderBy: { createdAt: "desc" }, take: 5 })

        const inputSnapshot = {
          level,
          streakDays: progress?.streakDays || 0,
          recentTasks: recentTasks.map((t) => ({ title: t.title })),
        }

        const systemPrompt = DAILY_LESSON_PROMPT.replace("{level}", String(level))
        const userBlock = `<<<DATA>>\n${JSON.stringify(inputSnapshot, null, 2)}\n<<<END DATA>>\n\nGenerate daily lesson for level ${level}.`

        const { data } = await generateWithValidation({
          prompt: userBlock,
          system: systemPrompt,
          schema: DailyLessonOutputSchema,
          cacheKey: `cron:lesson:${user.id}:${dateStr}:${level}`,
          cacheTtlSec: 600,
        })

        await db.promptLesson.create({
          data: {
            userId: user.id,
            date: dateObj,
            level: data.level,
            title: data.title,
            concept: data.concept,
            badPromptExample: data.badPromptExample,
            goodPromptExample: data.goodPromptExample,
            exercise: data.exercise,
            buildChallenge: data.buildChallenge,
            completed: false,
          },
        })

        await setCached(`lesson:${user.id}:${dateStr}`, null as any, 1).catch(() => {})
        generated++
      } catch (e) {
        errors.push(`User ${user.id}: ${String(e)}`)
      }
    }

    return NextResponse.json({ message: "Daily lesson cron executed", generated, skipped, errors, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error("Daily lesson cron error", e)
    return NextResponse.json({ error: "Failed", details: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
