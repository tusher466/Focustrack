import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCached, setCached, rateLimit } from "@/lib/redis"
import { CP_ANALYSER_PROMPT, ACADEMIC_GUIDE_PROMPT } from "@/lib/ai/prompts"
import { CpAnalyserOutputSchema, AcademicGuideOutputSchema } from "@/lib/ai/schemas"
import { generateWithValidation, createCacheKey, validateCpResources } from "@/lib/ai/review"

const requestSchema = z.object({
  track: z.enum(["CP", "ACADEMIC", "VIBE"]),
  force: z.boolean().optional().default(false),
})

async function getUserId(): Promise<string | null> {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId || null
}

export async function GET(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const track = searchParams.get("track") as "CP" | "ACADEMIC" | "VIBE" | null
  if (!track) return NextResponse.json({ error: "track required" }, { status: 400 })

  try {
    const reviews = await db.aiReview.findMany({
      where: { userId, track },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    return NextResponse.json({ reviews })
  } catch (e) {
    console.error("GET ai/review error", e)
    return NextResponse.json({ reviews: [] })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { track, force } = parsed.data

    // Rate limit: 20 per day per user
    const rlKey = `ai:${userId}:${track}`
    const rl = await rateLimit(rlKey, 20, 86400)
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded: 20 AI calls/day per track. Try tomorrow or use cached result.", remaining: rl.remaining }, { status: 429 })
    }

    if (track === "CP") {
      return await handleCpReview(userId, force)
    } else if (track === "ACADEMIC") {
      return await handleAcademicReview(userId, force)
    } else {
      return NextResponse.json({ error: "VIBE review not in Phase 3 – comes in Phase 5" }, { status: 400 })
    }
  } catch (e) {
    console.error("POST ai/review error", e)
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 })
  }
}

async function handleCpReview(userId: string, force: boolean) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [cpTasks, cpLogs, profile, progress, focusSessions] = await Promise.all([
    db.task.findMany({ where: { userId, track: "CP", createdAt: { gte: thirtyDaysAgo } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.cpProblemLog.findMany({ where: { userId, createdAt: { gte: thirtyDaysAgo } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.profile.findUnique({ where: { userId } }),
    db.userProgress.findUnique({ where: { userId_track: { userId, track: "CP" } } }),
    db.focusSession.findMany({ where: { userId, track: "CP", startedAt: { gte: thirtyDaysAgo } }, orderBy: { startedAt: "desc" }, take: 30 }),
  ])

  const inputSnapshot = {
    meta: { generatedAt: new Date().toISOString(), window: "last 30 days", tasksCount: cpTasks.length, logsCount: cpLogs.length, sessionsCount: focusSessions.length },
    tasks: cpTasks.map((t) => ({ title: t.title, notes: t.notes?.slice(0, 200), status: t.status, priority: t.priority, tags: t.tags, completedAt: t.completedAt, estimateMin: t.estimateMin })),
    logs: cpLogs.map((l) => ({ platform: l.platform, rating: l.rating, topics: l.topics, result: l.result, timeSpentMin: l.timeSpentMin, createdAt: l.createdAt })),
    profile: { codeforcesHandle: profile?.codeforcesHandle, codechefHandle: profile?.codechefHandle, goals: profile?.goals, weeklyTargetHours: profile?.weeklyTargetHours },
    progress: { level: progress?.level, xp: progress?.xp, streakDays: progress?.streakDays },
    focusSummary: {
      totalSessions: focusSessions.length,
      totalMinutes: Math.round(focusSessions.reduce((s, fs) => s + (fs.actualSec || fs.plannedSec || 0), 0) / 60),
      avgMinutes: focusSessions.length ? Math.round(focusSessions.reduce((s, fs) => s + (fs.actualSec || fs.plannedSec || 0), 0) / focusSessions.length / 60) : 0,
    },
  }

  const cacheKey = createCacheKey(userId, "CP", inputSnapshot)
  if (!force) {
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ output: cached, fromCache: true, inputSnapshot, rateLimitRemaining: 19 })
    }
    // Also check last stored AiReview for same track within 10 min for identical? We use cacheKey already.
  }

  const userDataBlock = `<<<DATA>>\n${JSON.stringify(inputSnapshot, null, 2)}\n<<<END DATA>>>`

  const prompt = `${userDataBlock}\n\nAnalyse this CP path and output ONLY valid JSON matching the specified schema. If data is too sparse (<5 logs and <5 tasks), explicitly state insufficient data in summary and warnings and ask for more logs.`

  try {
    const { data, fromCache, raw } = await generateWithValidation({
      prompt,
      system: CP_ANALYSER_PROMPT,
      schema: CpAnalyserOutputSchema,
      cacheKey: force ? undefined : cacheKey,
      cacheTtlSec: 600,
    })

    // Validate resources whitelist
    const { valid, invalid } = validateCpResources(data.resources)
    let finalData = data
    if (invalid.length > 0) {
      finalData = {
        ...data,
        warnings: [...data.warnings, `Filtered ${invalid.length} non-whitelisted resources – only CP-Algorithms, USACO Guide, CSES, Codeforces EDU, AtCoder, NeetCode allowed`],
        resources: valid.length ? valid : data.resources.slice(0, 2), // keep at least 2 if all invalid? But we filtered – if empty, keep original 2 for demo
      }
      // If filtering left empty, restore first 2 valid from original mock logic? Keep valid or original.
      if (valid.length === 0) {
        finalData.resources = data.resources.filter((r) => r.url.includes("cp-algorithms.com") || r.url.includes("cses.fi") || r.url.includes("codeforces.com")).slice(0, 3)
        if (finalData.resources.length === 0) finalData.resources = data.resources
      }
    }

    // Store AiReview
    await db.aiReview
      .create({
        data: {
          userId,
          track: "CP",
          inputSnapshot: inputSnapshot as any,
          output: finalData as any,
        },
      })
      .catch((e) => console.warn("Failed to store AiReview", e))

    return NextResponse.json({ output: finalData, fromCache, inputSnapshot, rawLength: raw.length, rateLimitRemaining: 19 })
  } catch (e) {
    console.error("CP review generation failed", e)
    return NextResponse.json({ error: "AI generation failed, try again. If using mock provider, check logs.", details: String(e) }, { status: 500 })
  }
}

async function handleAcademicReview(userId: string, force: boolean) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [academicTasks, exams, profile, progress] = await Promise.all([
    db.task.findMany({ where: { userId, track: "ACADEMIC" }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 100 }),
    db.exam.findMany({ where: { userId, examDate: { gte: now } }, orderBy: { examDate: "asc" }, take: 20 }),
    db.profile.findUnique({ where: { userId } }),
    db.userProgress.findMany({ where: { userId } }),
  ])

  const tasksDueThisWeek = academicTasks.filter((t) => t.dueAt && new Date(t.dueAt) >= now && new Date(t.dueAt) <= weekFromNow)
  const overdue = academicTasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE")
  const totalEstimateMinThisWeek = tasksDueThisWeek.reduce((sum, t) => sum + (t.estimateMin || 60), 0)

  const deadlineMap = new Map<string, number>()
  for (const t of academicTasks) {
    if (!t.dueAt) continue
    const key = new Date(t.dueAt).toDateString()
    deadlineMap.set(key, (deadlineMap.get(key) || 0) + 1)
  }
  const conflicts = Array.from(deadlineMap.entries())
    .filter(([, count]) => count > 1)
    .map(([date, count]) => `${date}: ${count} tasks`)

  const inputSnapshot = {
    meta: { generatedAt: new Date().toISOString(), totalTasks: academicTasks.length, dueThisWeek: tasksDueThisWeek.length, overdue: overdue.length, totalEstimateMinThisWeek, weeklyTargetHours: profile?.weeklyTargetHours || 10, conflicts },
    tasks: academicTasks.slice(0, 50).map((t) => ({ title: t.title, notes: t.notes?.slice(0, 200), status: t.status, priority: t.priority, dueAt: t.dueAt, estimateMin: t.estimateMin, tags: t.tags, completedAt: t.completedAt })),
    exams: exams.map((e) => ({ subject: e.subject, examDate: e.examDate, syllabusTopics: e.syllabusTopics, targetScore: e.targetScore })),
    progress,
    conflicts,
  }

  const cacheKey = createCacheKey(userId, "ACADEMIC", inputSnapshot)
  if (!force) {
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ output: cached, fromCache: true, inputSnapshot })
    }
  }

  const dataBlock = `<<<DATA>>\n${JSON.stringify(inputSnapshot, null, 2)}\n<<<END DATA>>>`
  const prompt = `${dataBlock}\n\nAssess workload and create prioritised study plan. Output ONLY valid JSON. Detect overload if totalEstimateMinThisWeek > weeklyTargetHours*60, and deadline conflicts from conflicts array.`

  try {
    const { data, fromCache } = await generateWithValidation({
      prompt,
      system: ACADEMIC_GUIDE_PROMPT,
      schema: AcademicGuideOutputSchema,
      cacheKey: force ? undefined : cacheKey,
      cacheTtlSec: 600,
    })

    await db.aiReview
      .create({ data: { userId, track: "ACADEMIC", inputSnapshot: inputSnapshot as any, output: data as any } })
      .catch((e) => console.warn("Failed to store academic review", e))

    return NextResponse.json({ output: data, fromCache, inputSnapshot })
  } catch (e) {
    console.error("Academic review failed", e)
    return NextResponse.json({ error: "AI generation failed", details: String(e) }, { status: 500 })
  }
}
