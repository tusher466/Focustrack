"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Copy, Check } from "lucide-react"
import { usePromptReviewer } from "@/hooks/use-vibe"

export function PromptReviewer() {
  const [prompt, setPrompt] = useState("")
  const [copied, setCopied] = useState(false)
  const reviewer = usePromptReviewer()

  const handleReview = () => {
    if (!prompt.trim()) return
    reviewer.mutate(prompt)
  }

  const output = reviewer.data?.output

  const copyImproved = async () => {
    if (!output?.improvedPrompt) return
    await navigator.clipboard.writeText(output.improvedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-purple-600/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" /> AI Prompt Reviewer</CardTitle>
        <CardDescription>Paste a prompt → get score /10 + improvements + rewritten version. Cached 10 min, rate limited 20/day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paste your prompt here... e.g. 'Write a function to sort tasks'" rows={4} />

        <Button onClick={handleReview} disabled={reviewer.isPending || !prompt.trim()} className="w-full">
          {reviewer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Review Prompt
        </Button>

        {reviewer.error && <p className="text-xs text-red-600">{String(reviewer.error)}</p>}

        {output && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={output.score >= 8 ? "academic" : output.score >= 5 ? "secondary" : "destructive"} className="text-sm">Score: {output.score}/10</Badge>
              {reviewer.data?.fromCache && <Badge variant="outline" className="text-[11px]">cached</Badge>}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <h4 className="text-xs font-semibold text-emerald-700">Strengths</h4>
                <ul className="mt-1 space-y-1">
                  {output.strengths.map((s: string, i: number) => <li key={i} className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border rounded px-2 py-1">{s}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-red-700">Issues</h4>
                <ul className="mt-1 space-y-1">
                  {output.issues.map((s: string, i: number) => <li key={i} className="text-xs bg-red-50 dark:bg-red-950/20 border rounded px-2 py-1">{s}</li>)}
                </ul>
              </div>
            </div>

            <div className="rounded border bg-card p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold">Improved Prompt</h4>
                <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={copyImproved}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted p-2 rounded border">{output.improvedPrompt}</pre>
            </div>

            <div>
              <h4 className="text-xs font-semibold">Tips</h4>
              <ul className="mt-1 space-y-1">
                {output.tips.map((t: string, i: number) => <li key={i} className="text-xs bg-muted rounded px-2 py-1">{t}</li>)}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
