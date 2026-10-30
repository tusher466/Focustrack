import { describe, it, expect } from "vitest"
import { deduplicateByUrl } from "@/lib/news/sources"
import { validateCpResources } from "@/lib/ai/review"

describe("news deduplication", () => {
  it("deduplicates by URL", () => {
    const items = [
      { source: "HN", title: "A", url: "https://example.com/a", publishedAt: new Date(), tags: ["Web"] },
      { source: "dev.to", title: "A again", url: "https://example.com/a", publishedAt: new Date(), tags: ["Web"] },
      { source: "HN", title: "B", url: "https://example.com/b", publishedAt: new Date(), tags: ["AI"] },
    ]
    const deduped = deduplicateByUrl(items as any)
    expect(deduped.length).toBe(2)
  })
})

describe("resource whitelist", () => {
  it("filters non-whitelisted resources", () => {
    const resources = [
      { title: "CP-Algo", url: "https://cp-algorithms.com/algo", type: "article", why: "good" },
      { title: "Random blog", url: "https://randomblog.com/xyz", type: "article", why: "bad" },
      { title: "USACO", url: "https://usaco.guide/gold", type: "course", why: "good" },
    ] as any
    const { valid, invalid } = validateCpResources(resources)
    expect(valid.length).toBe(2)
    expect(invalid.length).toBe(1)
  })
})
