"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"

export function CpLogForm({ taskId }: { taskId?: string }) {
  const qc = useQueryClient()
  const [platform, setPlatform] = useState<"CODEFORCES" | "CODECHEF" | "OTHER">("CODEFORCES")
  const [url, setUrl] = useState("")
  const [rating, setRating] = useState("")
  const [topics, setTopics] = useState("")
  const [result, setResult] = useState<"SOLVED" | "PARTIAL" | "FAILED" | "EDITORIAL_USED">("SOLVED")
  const [time, setTime] = useState("")

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/cp-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["cp-logs"] })
      setUrl("")
      setRating("")
      setTopics("")
      setTime("")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      taskId: taskId || null,
      platform,
      problemUrl: url,
      rating: rating ? parseInt(rating) : null,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      result,
      timeSpentMin: time ? parseInt(time) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <h4 className="font-semibold text-sm">Quick-log solved problem</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CODEFORCES">Codeforces</SelectItem>
              <SelectItem value="CODECHEF">CodeChef</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Result</Label>
          <Select value={result} onValueChange={(v: any) => setResult(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLVED">SOLVED</SelectItem>
              <SelectItem value="PARTIAL">PARTIAL</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
              <SelectItem value="EDITORIAL_USED">EDITORIAL_USED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Problem URL *</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://codeforces.com/problemset/problem/..." required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label>Rating</Label>
          <Input type="number" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="1500" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Topics (comma)</Label>
          <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="dp, binary-search" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Time spent (min)</Label>
        <Input type="number" value={time} onChange={(e) => setTime(e.target.value)} placeholder="45" />
      </div>
      <Button type="submit" disabled={mutation.isPending || !url} className="w-full">
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Log Problem
      </Button>
    </form>
  )
}
