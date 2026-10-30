import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCached, setCached, rateLimit } from "@/lib/redis"
import { DAILY_LESSON_PROMPT } from "@/lib/ai/prompts"
import { DailyLessonOutputSchema } from "@/lib/ai/schemas"
import { generateWithValidation } from "@/lib/ai/review"
import { getLevelFromXp, xpToNextLevel } from "@/lib/gamification/levels"
import { calculateStreak } from "@/lib/gamification/streaks"
import { xpForLesson } from "@/lib/gamification/xp"

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

function getTodayDateInTimezone(timezone: string): { dateStr: string; dateObj: Date } {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" })
    const dateStr = formatter.format(new Date()) // YYYY-MM-DD
    const dateObj = new Date(dateStr + "T00:00:00.000Z")
    return { dateStr, dateObj }
  } catch {
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]
    return { dateStr, dateObj: new Date(dateStr + "T00:00:00.000Z") }
  }
}

const completeSchema = z.object({ lessonId: z.string().min(1) })

export async function GET(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await db.profile.findUnique({ where: { userId } })
  const timezone = profile?.timezone || "UTC"
  const { dateObj, dateStr } = getTodayDateInTimezone(timezone)

  // Try to find today's lesson
  let lesson = await db.promptLesson.findUnique({ where: { userId_date: { userId, date: dateObj } } }).catch(() => null)

  if (lesson) {
    return NextResponse.json({ lesson, isNew: false, dateStr, timezone })
  }

  // Check cache for lesson generation to avoid double generation
  const cacheKey = `lesson:${userId}:${dateStr}`
  const cached = await getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ lesson: cached, isNew: false, fromCache: true, dateStr, timezone })
  }

  // Generate new lesson
  try {
    const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: "VIBE" } } })
    const level = progress?.level || 1
    const xp = progress?.xp || 0
    const streak = progress?.streakDays || 0

    const recentTasks = await db.task.findMany({ where: { userId, track: "VIBE" }, orderBy: { createdAt: "desc" }, take: 10 })
    const recentLessons = await db.promptLesson.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 5 })

    const inputSnapshot = {
      level,
      xp,
      streakDays: streak,
      recentTasks: recentTasks.map((t) => ({ title: t.title, status: t.status })),
      recentLessons: recentLessons.map((l) => ({ title: l.title, level: l.level, completed: l.completed })),
    }

    const systemPrompt = DAILY_LESSON_PROMPT.replace("{level}", String(level))
    const userBlock = `<<<DATA>>\n${JSON.stringify(inputSnapshot, null, 2)}\n<<<END DATA>>\n\nGenerate daily lesson for this user at level ${level}. Output ONLY JSON.`

    // Rate limit
    const rl = await rateLimit(`ai:lesson:${userId}`, 20, 86400)
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit 20/day" }, { status: 429 })
    }

    const { data } = await generateWithValidation({
      prompt: userBlock,
      system: systemPrompt,
      schema: DailyLessonOutputSchema,
      cacheKey: `ai:lesson:gen:${userId}:${level}:${dateStr}`,
      cacheTtlSec: 600,
    })

    // Ensure level matches user's level (AI might drift)
    const finalLevel = data.level === level ? data.level : level

    lesson = await db.promptLesson.create({
      data: {
        userId,
        date: dateObj,
        level: finalLevel,
        title: data.title,
        concept: data.concept,
        badPromptExample: data.badPromptExample,
        goodPromptExample: data.goodPromptExample,
        exercise: data.exercise,
        buildChallenge: data.buildChallenge,
        completed: false,
      },
    })

    await setCached(cacheKey, lesson, 86400)

    return NextResponse.json({ lesson, isNew: true, dateStr, timezone })
  } catch (e) {
    console.error("Lesson generation failed", e)
    // Fallback static lesson if AI fails
    const fallback = {
      userId,
      date: dateObj,
      level: (await db.userProgress.findUnique({ where: { userId_track: { userId, track: "VIBE" } } }))?.level || 1,
      title: "L1: Clear Task Prompts – The Foundation",
      concept: "The most common failure in prompting is vagueness. A clear task prompt includes verb, outcome, and minimal context. Without these, AI guesses. With them, it delivers.",
      badPromptExample: "Write code for sorting",
      goodPromptExample: "Role: You are a senior TS dev. Task: Write a function sortTasks(tasks: Task[]) that sorts by priority HIGH>MEDIUM>LOW then due date ascending. Use date-fns, pure, no mutation. Output only code with JSDoc.",
      exercise: "Rewrite this vague prompt: 'Make a todo app'. Add role, clear outcome, constraints (tech stack Next.js, no DB), format (component list + code).",
      buildChallenge: "Build a Prompt Library CRUD component (as in FocusTrack) – save prompts with rating. Use your improved prompt to generate it.",
      completed: false,
    }

    try {
      const created = await db.promptLesson.create({ data: fallback as any })
      return NextResponse.json({ lesson: created, isNew: true, fallback: true, dateStr, timezone })
    } catch {
      return NextResponse.json({ error: "Failed to generate lesson", details: String(e) }, { status: 500 })
    }
  }
}

export async function POST(req: Request) {
  // Force generate new lesson for today (ignores existing) – used for testing
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const force = body.force === true

  const profile = await db.profile.findUnique({ where: { userId } })
  const timezone = profile?.timezone || "UTC"
  const { dateObj } = getTodayDateInTimezone(timezone)

  if (!force) {
    const existing = await db.promptLesson.findUnique({ where: { userId_date: { userId, date: dateObj } } })
    if (existing) return NextResponse.json({ lesson: existing, isNew: false })
  }

  // Delete existing if force
  if (force) {
    await db.promptLesson.deleteMany({ where: { userId, date: dateObj } }).catch(() => {})
  }

  // Generate via GET logic by clearing cache
  await setCached(`lesson:${userId}:${getTodayDateInTimezone(timezone).dateStr}`, null as any, 1).catch(() => {})
  // Re-use GET
  return GET(req)
}

export async function PATCH(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = completeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const lesson = await db.promptLesson.findFirst({ where: { id: parsed.data.lessonId, userId } })
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (lesson.completed) {
    return NextResponse.json({ lesson, alreadyCompleted: true })
  }

  // Mark completed
  const updated = await db.promptLesson.update({ where: { id: lesson.id }, data: { completed: true } })

  // XP and streak handling
  let progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: "VIBE" } } })
  if (!progress) {
    progress = await db.userProgress.create({ data: { userId, track: "VIBE", xp: 0, level: 1, streakDays: 0 } })
  }

  const xpGain = xpForLesson(lesson.level)
  const newXp = progress.xp + xpGain
  const newLevel = getLevelFromXp(newXp)

  // Streak logic
  const lastDate = progress.lastActiveDate
  const today = new Date()
  const { newStreak, isContinuation } = calculateStreak(lastDate ? new Date(lastDate) : null, today)
  let streakDays = progress.streakDays
  if (lastDate) {
    const last = new Date(lastDate)
    last.setHours(0, 0, 0, 0)
    const cur = new Date()
    cur.setHours(0, 0, 0, 0)
    const diff = Math.round((cur.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) {
      // same day, no streak increase
    } else if (diff === 1) {
      streakDays += 1
    } else {
      streakDays = 1
    }
  } else {
    streakDays = 1
  }

  const updatedProgress = await db.userProgress.update({
    where: { id: progress.id },
    data: {
      xp: newXp,
      level: newLevel,
      streakDays,
      lastActiveDate: new Date(),
    },
  })

  const { nextThreshold, progressPct } = xpToNextLevel(newXp)

  return NextResponse.json({
    lesson: updated,
    progress: updatedProgress,
    xpGain,
    leveledUp: newLevel > progress.level,
    nextThreshold,
    progressPct,
    streakDays,
  })
}
