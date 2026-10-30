// Provider-agnostic AI service
// Selected by env vars AI_PROVIDER, AI_MODEL, AI_API_KEY
// Called ONLY from server routes. Never expose keys to client.

import { getEnv } from "../env"

export interface AiProvider {
  name: string
  generate(prompt: string, system?: string): Promise<string>
}

class OpenAIProvider implements AiProvider {
  name = "openai"
  async generate(prompt: string, system?: string): Promise<string> {
    const env = getEnv()
    if (!env.AI_API_KEY) throw new Error("AI_API_KEY missing for OpenAI")
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OpenAI API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ""
  }
}

class AnthropicProvider implements AiProvider {
  name = "anthropic"
  async generate(prompt: string, system?: string): Promise<string> {
    const env = getEnv()
    if (!env.AI_API_KEY) throw new Error("AI_API_KEY missing for Anthropic")
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.AI_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: 2000,
        system: system || "",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Anthropic API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    // Anthropic returns content array
    const content = data.content?.[0]?.text || ""
    return content
  }
}

class GroqProvider implements AiProvider {
  name = "groq"
  async generate(prompt: string, system?: string): Promise<string> {
    const env = getEnv()
    if (!env.AI_API_KEY) throw new Error("AI_API_KEY missing for Groq")
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Groq API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ""
  }
}

class GoogleProvider implements AiProvider {
  name = "google"
  async generate(prompt: string, system?: string): Promise<string> {
    const env = getEnv()
    if (!env.AI_API_KEY) throw new Error("AI_API_KEY missing for Google")
    // Gemini API
    const model = env.AI_MODEL.includes("gemini") ? env.AI_MODEL : "gemini-1.5-flash"
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system ? system + "\n\n" : ""}${prompt}` }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Google API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }
}

class OllamaProvider implements AiProvider {
  name = "ollama"
  async generate(prompt: string, system?: string): Promise<string> {
    const env = getEnv()
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.AI_MODEL,
        prompt: `${system ? system + "\n\n" : ""}${prompt}`,
        stream: false,
        format: "json",
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ollama API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    return data.response || ""
  }
}

class MockProvider implements AiProvider {
  name = "mock"
  async generate(prompt: string, system?: string): Promise<string> {
    const isCP = (system || prompt).toLowerCase().includes("competitive programming") || (system || "").includes("CP")
    const isAcademic = (system || prompt).toLowerCase().includes("academic") || (system || "").toLowerCase().includes("study coach")

    // Try to parse DATA block to detect sparsity
    const dataMatch = prompt.match(/<<<DATA>>>([\s\S]*?)<<<END DATA>>>/)
    let taskCount = 0
    let logCount = 0
    if (dataMatch) {
      try {
        const json = JSON.parse(dataMatch[1])
        taskCount = json.tasks?.length || json.cpTasks?.length || json.academicTasks?.length || 0
        logCount = json.logs?.length || json.cpLogs?.length || 0
      } catch {}
    }

    if (isCP) {
      if (taskCount + logCount < 3) {
        return JSON.stringify({
          verdict: "needs_adjustment",
          summary: "Insufficient data – only " + (taskCount + logCount) + " CP tasks/logs in last 30 days. Need at least 5-10 entries to give personalized guidance. Please log more problems with rating, topics, and time spent.",
          strengths: [],
          gaps: ["Sparse logging – cannot assess topic coverage", "No rating progression visible"],
          next7Days: [
            { day: "Day 1", topic: "Binary Search", targetRating: 1200, reason: "Foundation – many problems need it" },
            { day: "Day 2", topic: "Two Pointers", targetRating: 1200, reason: "Complements binary search" },
          ],
          resources: [
            { title: "CP-Algorithms - Binary Search", url: "https://cp-algorithms.com/num_methods/binary_search.html", type: "article", why: "Clear explanation with problems" },
            { title: "CSES Problem Set", url: "https://cses.fi/problemset/", type: "problemset", why: "Structured practice" },
          ],
          warnings: ["Data too sparse – mock analysis, add more logs", "Using mock provider – configure AI_API_KEY for real AI"],
        })
      }
      return JSON.stringify({
        verdict: "needs_adjustment",
        summary: "You are solving consistently but rating spread is narrow (1200-1400). Strength in implementation but gaps in DP and graphs. Path needs broader topic coverage.",
        strengths: ["Consistent daily logging", "Good time management (avg 45m per problem)", "Solid in binary search & two pointers"],
        gaps: ["No DP problems logged", "Graph topics missing", "No editorial review habit"],
        next7Days: [
          { day: "Mon", topic: "DP - Introduction (AtCoder Educational DP)", targetRating: 1200, reason: "Build DP foundation" },
          { day: "Tue", topic: "DP - Knapsack", targetRating: 1300, reason: "Classic DP pattern" },
          { day: "Wed", topic: "BFS/DFS", targetRating: 1300, reason: "Graph basics" },
          { day: "Thu", topic: "CSES - Searching & Sorting revision", targetRating: 1200, reason: "Consolidate strengths" },
          { day: "Fri", topic: "Codeforces EDU - Binary Search", targetRating: 1400, reason: "Push rating slightly" },
          { day: "Sat", topic: "Virtual Contest Div2", targetRating: 1400, reason: "Apply under time pressure" },
          { day: "Sun", topic: "Review & Upsolve with Editorial", targetRating: 1300, reason: "Learn from failures" },
        ],
        resources: [
          { title: "CP-Algorithms - DP", url: "https://cp-algorithms.com/diff_equations/dynamics.html", type: "article", why: "DP patterns" },
          { title: "AtCoder Educational DP Contest", url: "https://atcoder.jp/contests/dp", type: "problemset", why: "Graded DP problems" },
          { title: "USACO Guide - Graphs", url: "https://usaco.guide/gold/graphs", type: "course", why: "Graph theory from basics" },
          { title: "Codeforces EDU - Binary Search", url: "https://codeforces.com/edu/course/2", type: "course", why: "Your strength, push harder" },
          { title: "NeetCode - DP Playlist", url: "https://neetcode.io/roadmap", type: "video", why: "Visual DP explanations" },
          { title: "CSES Problem Set - Dynamic Programming", url: "https://cses.fi/problemset/list/", type: "problemset", why: "Practice set" },
        ],
        warnings: ["Mock provider – configure AI_API_KEY for real personalised analysis", "No contest results found – participate in rated contests for better signal"],
      })
    }

    if (isAcademic) {
      return JSON.stringify({
        workloadAssessment: taskCount < 3 ? "Very light workload this week – good opportunity to catch up, but data sparse" : "Moderate workload – 2 deadlines overlapping on Friday, about 12h estimated vs 15h target – feasible but tight.",
        prioritisedPlan: [
          { subject: "Operating Systems", topic: "Deadlocks - Banker Algorithm", due: "2026-11-02", priority: "high", reason: "Exam in 5 days, confidence low" },
          { subject: "DSA", topic: "Graphs - Topological Sort", due: "2026-11-03", priority: "medium", reason: "Assignment deadline" },
          { subject: "DBMS", topic: "Normalization", due: "2026-11-05", priority: "low", reason: "No immediate deadline, but weak" },
        ],
        studyTechniques: [
          { technique: "Active Recall", howToApply: "For OS Deadlocks: close notes, write 4 conditions for deadlock from memory, then check. Make flashcards for Banker algorithm steps." },
          { technique: "Spaced Repetition", howToApply: "DSA Graphs: review topological sort today, again in 3 days, then 7 days. Use Anki or paper." },
          { technique: "Feynman Technique", howToApply: "DBMS Normalization: explain 1NF→BCNF to imaginary junior as if teaching, identify gaps." },
        ],
        risks: taskCount < 3 ? ["Too few tasks logged – cannot detect overload accurately"] : ["2 deadlines on Fri – risk of overload", "OS confidence 2/5 – needs immediate focus", "No revision scheduled for past topics – forgetting curve risk"],
        weeklySchedule: [
          { day: "Monday", blocks: [{ time: "09:00-11:00", subject: "OS", activity: "Deadlocks theory + problems" }, { time: "11:30-12:30", subject: "DSA", activity: "Graphs revision" }] },
          { day: "Tuesday", blocks: [{ time: "10:00-12:00", subject: "OS", activity: "Banker algorithm practice" }] },
          { day: "Wednesday", blocks: [{ time: "09:00-10:30", subject: "DBMS", activity: "Normalization" }] },
        ],
      })
    }

    // Default generic
    return JSON.stringify({
      verdict: "needs_adjustment",
      summary: "Mock response - configure AI_PROVIDER and AI_API_KEY for real analysis. Detected " + taskCount + " tasks.",
      strengths: ["Consistent logging"],
      gaps: ["Need more diverse topics"],
      next7Days: [],
      resources: [],
      warnings: ["Using mock provider - no real AI", "Add more detailed logs for better analysis"],
    })
  }
}

export function getAiProvider(): AiProvider {
  const env = getEnv()
  // If no key, use mock immediately (still respects provider choice for logging)
  if (!env.AI_API_KEY) {
    console.warn(`AI_API_KEY missing, using mock provider (requested ${env.AI_PROVIDER})`)
    return new MockProvider()
  }
  switch (env.AI_PROVIDER) {
    case "openai":
      return new OpenAIProvider()
    case "anthropic":
      return new AnthropicProvider()
    case "groq":
      return new GroqProvider()
    case "google":
      return new GoogleProvider()
    case "ollama":
      return new OllamaProvider()
    default:
      console.warn(`Provider ${env.AI_PROVIDER} not yet implemented, using mock`)
      return new MockProvider()
  }
}
