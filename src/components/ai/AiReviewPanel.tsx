"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Milestone, BookOpen } from "lucide-react"

type CpOutput = {
  verdict: "on_track" | "needs_adjustment" | "off_track"
  summary: string
  strengths: string[]
  gaps: string[]
  next7Days: { day: string; topic: string; targetRating: number; reason: string }[]
  resources: { title: string; url: string; type: string; why: string }[]
  warnings: string[]
}

type AcademicOutput = {
  workloadAssessment: string
  prioritisedPlan: { subject: string; topic: string; due?: string; priority: string; reason: string }[]
  studyTechniques: { technique: string; howToApply: string }[]
  risks: string[]
  weeklySchedule: { day: string; blocks: { time: string; subject: string; activity: string }[] }[]
}

export function AiReviewPanel({
  track,
  output,
  isLoading,
  error,
  onGenerate,
  fromCache,
}: {
  track: "CP" | "ACADEMIC"
  output?: CpOutput | AcademicOutput | null
  isLoading: boolean
  error?: string | null
  onGenerate: (force?: boolean) => void
  fromCache?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm">Analysing your {track} path with AI...</p>
          <p className="text-xs text-muted-foreground">Provider: {process.env.NEXT_PUBLIC_AI_PROVIDER || "env AI_PROVIDER"} • Cached 10 min • Rate limit 20/day</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> AI Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={() => onGenerate(true)}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!output) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" /> {track === "CP" ? "AI Path Analyser" : "AI Academic Guide"}
          </CardTitle>
          <CardDescription>
            {track === "CP"
              ? "Input = last 30 days CP tasks + problem logs + handles + goal. Validated JSON output with verdict, gaps, 7-day plan, resources."
              : "Input = tasks, deadlines, exams, completion history. Output prioritised plan, techniques, risks, schedule."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Base advice ONLY on your data – never invents contest results</p>
            <p>• CP resources whitelist: CP-Algorithms, USACO Guide, CSES, Codeforces EDU, AtCoder, NeetCode</p>
            <p>• Cached 10 min, rate limited 20/day, stored in AiReview</p>
            <p>• Guard: user text in delimited block, prompt injection protection</p>
          </div>
          <Button onClick={() => onGenerate(false)} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" /> {track === "CP" ? "Is my path correct?" : "Generate Academic Plan"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (track === "CP") {
    const cp = output as CpOutput
    return (
      <div className="space-y-4">
        <Card className={cp.verdict === "on_track" ? "border-emerald-500/30" : cp.verdict === "off_track" ? "border-red-500/30" : "border-yellow-500/30"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {cp.verdict === "on_track" ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className={`h-5 w-5 ${cp.verdict === "off_track" ? "text-red-600" : "text-yellow-600"}`} />}
                Path Verdict: <span className="uppercase">{cp.verdict.replace("_", " ")}</span>
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={cp.verdict === "on_track" ? "academic" : cp.verdict === "off_track" ? "destructive" : "secondary"}>{cp.verdict}</Badge>
                {fromCache && <Badge variant="outline">cached</Badge>}
              </div>
            </div>
            <CardDescription>{cp.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1"><CheckCircle className="h-4 w-4 text-emerald-600" /> Strengths</h4>
                <ul className="mt-2 space-y-1">
                  {cp.strengths.map((s, i) => <li key={i} className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded px-2 py-1">{s}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-orange-500" /> Gaps</h4>
                <ul className="mt-2 space-y-1">
                  {cp.gaps.map((g, i) => <li key={i} className="text-xs bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded px-2 py-1">{g}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1"><Milestone className="h-4 w-4 text-blue-600" /> Next 7 Days Plan</h4>
              <div className="mt-2 grid gap-2">
                {cp.next7Days.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border rounded p-2">
                    <span className="font-bold w-12">{d.day}</span>
                    <span className="flex-1">{d.topic} <span className="text-muted-foreground">({d.targetRating})</span></span>
                    <span className="text-[11px] text-muted-foreground text-right max-w-[50%]">{d.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1"><BookOpen className="h-4 w-4 text-purple-600" /> Resources (whitelisted only)</h4>
              <div className="mt-2 space-y-2">
                {cp.resources.map((r, i) => (
                  <div key={i} className="text-xs border rounded p-2 flex gap-2 justify-between">
                    <div className="flex-1">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{r.title} ↗</a>
                      <span className="ml-2 text-[10px] bg-muted px-1 rounded">{r.type}</span>
                      <p className="text-muted-foreground mt-1">{r.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {cp.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-600">Warnings</h4>
                <ul className="mt-1 space-y-1">
                  {cp.warnings.map((w, i) => <li key={i} className="text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 rounded px-2 py-1">{w}</li>)}
                </ul>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => onGenerate(true)} className="w-full mt-2">Regenerate (force, ignores cache)</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Academic
  const acad = output as AcademicOutput
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workload Assessment {fromCache && <Badge variant="outline" className="ml-2">cached</Badge>}</CardTitle>
          <CardDescription>{acad.workloadAssessment}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Prioritised Plan</h4>
            <div className="mt-2 space-y-2">
              {acad.prioritisedPlan.map((p, i) => (
                <div key={i} className="text-xs border rounded p-2 flex justify-between gap-2">
                  <div>
                    <span className="font-medium">{p.subject}: {p.topic}</span>
                    <span className={`ml-2 text-[10px] px-1 rounded ${p.priority==="high" ? "bg-red-100 text-red-700" : p.priority==="medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{p.priority}</span>
                    <p className="text-muted-foreground">{p.reason} {p.due && `• Due ${p.due}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Study Techniques (applied to YOUR subjects)</h4>
            <div className="mt-2 space-y-2">
              {acad.studyTechniques.map((s, i) => (
                <div key={i} className="text-xs border rounded p-2 bg-blue-50/50 dark:bg-blue-950/20">
                  <p className="font-medium">{s.technique}</p>
                  <p className="text-muted-foreground mt-1">{s.howToApply}</p>
                </div>
              ))}
            </div>
          </div>

          {acad.risks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-600">Risks</h4>
              <ul className="mt-1 space-y-1">
                {acad.risks.map((r,i)=><li key={i} className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded px-2 py-1">{r}</li>)}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold">Weekly Schedule</h4>
            <div className="mt-2 space-y-2">
              {acad.weeklySchedule.map((d,i)=>(
                <div key={i} className="text-xs border rounded p-2">
                  <p className="font-bold">{d.day}</p>
                  <div className="mt-1 space-y-1">
                    {d.blocks.map((b,j)=><p key={j} className="flex justify-between"><span>{b.time} – {b.subject}</span><span className="text-muted-foreground">{b.activity}</span></p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={()=>onGenerate(true)} className="w-full">Regenerate</Button>
        </CardContent>
      </Card>
    </div>
  )
}
