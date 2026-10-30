import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCached, setCached, rateLimit } from "@/lib/redis"
import { PROMPT_REVIEWER_PROMPT } from "@/lib/ai/prompts"
import { PromptReviewOutputSchema } from "@/lib/ai/schemas"
import { generateWithValidation, createCacheKey } from "@/lib/ai/review"

async function getUserId() {
  const session = await auth().catch(() => null)
  let userId = session?.user?.id
  if (!userId) {
    const demo = await db.user.findFirst({ where: { email: "demo@focustrack.dev" } }).catch(() => null)
    if (demo) userId = demo.id
  }
  return userId
}

const bodySchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(5000, "Prompt too long, max 5000 chars"),
})

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { prompt } = parsed.data

  // Rate limit
  const rl = await rateLimit(`ai:prompt-review:${userId}`, 20, 86400)
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit 20/day" }, { status: 429 })

  const cacheKey = createCacheKey(userId, "PROMPT_REVIEW", { prompt: prompt.slice(0, 200) })
  const cached = await getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ output: cached, fromCache: true })
  }

  const system = PROMPT_REVIEWER_PROMPT
  const userBlock = `<<<DATA>>\n${prompt}\n<<<END DATA>>\n\nReview this prompt and output ONLY valid JSON matching schema.`

  try {
    const { data, fromCache } = await generateWithValidation({
      prompt: userBlock,
      system,
      schema: PromptReviewOutputSchema,
      cacheKey,
      cacheTtlSec: 600,
    })

    // Optionally award small XP for using reviewer
    try {
      const progress = await db.userProgress.findUnique({ where: { userId_track: { userId, track: "VIBE" } } })
      if (progress) {
        await db.userProgress.update({ where: { id: progress.id }, data: { xp: progress.xp + 2, lastActiveDate: new Date() } })
      }
    } catch {}

    return NextResponse.json({ output: data, fromCache })
  } catch (e) {
    console.error("Prompt review failed", e)
    return NextResponse.json({ error: "AI review failed", details: String(e) }, { status: 500 })
  }
}
