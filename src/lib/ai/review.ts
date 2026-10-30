import { z } from "zod"
import { getAiProvider } from "./provider"
import { getCached, setCached } from "../redis"
import crypto from "crypto"

// Centralised review handling with Zod validation + retry once with repair instruction + caching

export async function generateWithValidation<T>({
  prompt,
  system,
  schema,
  cacheKey,
  cacheTtlSec = 600,
}: {
  prompt: string
  system: string
  schema: z.ZodSchema<T>
  cacheKey?: string
  cacheTtlSec?: number
}): Promise<{ data: T; fromCache: boolean; raw: string }> {
  const provider = getAiProvider()

  if (cacheKey) {
    try {
      const cached = await getCached<T>(cacheKey)
      if (cached) {
        // Validate cached still matches schema
        const parsed = schema.safeParse(cached)
        if (parsed.success) {
          return { data: parsed.data, fromCache: true, raw: JSON.stringify(cached) }
        }
      }
    } catch {}
  }

  let raw = await provider.generate(prompt, system)

  const parseAndRepair = async (text: string, attempt = 1): Promise<T> => {
    try {
      const jsonStr = extractJson(text)
      const parsedJson = JSON.parse(jsonStr)
      return schema.parse(parsedJson)
    } catch (e) {
      if (attempt >= 2) throw e
      const repairPrompt = `${prompt}\n\nPrevious output failed Zod validation. Error: ${String(e)}. Please output ONLY valid JSON matching the schema, no explanation, no markdown, just raw JSON.`
      const repaired = await provider.generate(repairPrompt, system + "\nYou must output ONLY valid JSON, no markdown, no explanation.")
      return parseAndRepair(repaired, attempt + 1)
    }
  }

  const validated = await parseAndRepair(raw)

  if (cacheKey) {
    await setCached(cacheKey, validated as any, cacheTtlSec)
  }

  return { data: validated, fromCache: false, raw }
}

function extractJson(text: string): string {
  const codeFence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeFence) return codeFence[1].trim()
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1)
  }
  return text.trim()
}

export function createCacheKey(userId: string, track: string, inputSnapshot: any): string {
  // Hash input snapshot to detect identical requests
  const str = JSON.stringify(inputSnapshot)
  const hash = crypto.createHash("sha256").update(str).digest("hex").slice(0, 16)
  return `ai:review:${userId}:${track}:${hash}`
}

// Whitelist check for resources (CP only)
const ALLOWED_RESOURCE_DOMAINS = [
  "cp-algorithms.com",
  "usaco.guide",
  "cses.fi",
  "codeforces.com",
  "atcoder.jp",
  "neetcode.io",
]

export function validateCpResources<T extends { url: string }>(resources: T[]): { valid: T[]; invalid: T[] } {
  const valid: T[] = []
  const invalid: T[] = []
  for (const r of resources) {
    try {
      const url = new URL(r.url)
      const host = url.hostname.replace(/^www\./, "")
      const isAllowed = ALLOWED_RESOURCE_DOMAINS.some((d) => host.includes(d) || r.url.includes(d))
      if (isAllowed) valid.push(r)
      else invalid.push(r)
    } catch {
      invalid.push(r)
    }
  }
  return { valid, invalid }
}
