"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"

type Topic = { topic: string; confidence: number; status: "TODO" | "DOING" | "DONE" }

export function ExamForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => Promise<void>; isSubmitting?: boolean }) {
  const [subject, setSubject] = useState("")
  const [examDate, setExamDate] = useState("")
  const [targetScore, setTargetScore] = useState("")
  const [topics, setTopics] = useState<Topic[]>([{ topic: "", confidence: 3, status: "TODO" }])
  const [bulkInput, setBulkInput] = useState("")

  const addTopic = () => setTopics([...topics, { topic: "", confidence: 3, status: "TODO" }])
  const removeTopic = (idx: number) => setTopics(topics.filter((_, i) => i !== idx))
  const updateTopic = (idx: number, field: keyof Topic, value: any) => {
    const copy = [...topics]
    ;(copy[idx] as any)[field] = value
    setTopics(copy)
  }

  const handleBulkAdd = () => {
    const lines = bulkInput.split("\n").map((l) => l.trim()).filter(Boolean)
    const newTopics: Topic[] = lines.map((line) => {
      // Format: "Topic name | confidence 1-5 | status"
      const parts = line.split("|").map((p) => p.trim())
      return {
        topic: parts[0] || line,
        confidence: parts[1] ? Math.min(5, Math.max(1, parseInt(parts[1]) || 3)) : 3,
        status: (parts[2] as any) || "TODO",
      }
    })
    setTopics([...topics.filter((t) => t.topic.trim()), ...newTopics])
    setBulkInput("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTopics = topics.filter((t) => t.topic.trim()).map((t) => ({ topic: t.topic.trim(), confidence: t.confidence, status: t.status }))
    if (!subject.trim() || !examDate || validTopics.length === 0) return

    await onSubmit({
      subject: subject.trim(),
      examDate: new Date(examDate).toISOString(),
      syllabusTopics: validTopics,
      targetScore: targetScore ? parseInt(targetScore) : null,
    })

    setSubject("")
    setExamDate("")
    setTargetScore("")
    setTopics([{ topic: "", confidence: 3, status: "TODO" }])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Subject *</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Operating Systems" required />
        </div>
        <div className="space-y-1">
          <Label>Exam Date *</Label>
          <Input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Target Score (optional)</Label>
        <Input type="number" min={0} max={100} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} placeholder="85" />
      </div>

      <div className="space-y-2">
        <Label>Syllabus Topics – checklist with confidence 1-5 (1=weakest)</Label>
        {topics.map((t, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input className="flex-1" value={t.topic} onChange={(e) => updateTopic(idx, "topic", e.target.value)} placeholder={`Topic ${idx + 1}`} />
            <SelectWrapper value={t.confidence} onChange={(v) => updateTopic(idx, "confidence", parseInt(v))} options={[
              { value: "1", label: "1 - Weak" },
              { value: "2", label: "2" },
              { value: "3", label: "3 - Med" },
              { value: "4", label: "4" },
              { value: "5", label: "5 - Strong" },
            ]} />
            <SelectWrapper value={t.status} onChange={(v) => updateTopic(idx, "status", v)} options={[
              { value: "TODO", label: "TODO" },
              { value: "DOING", label: "DOING" },
              { value: "DONE", label: "DONE" },
            ]} />
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeTopic(idx)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={addTopic}><Plus className="h-4 w-4 mr-1" /> Add Topic</Button>
      </div>

      <div className="space-y-2">
        <Label>Bulk add (one per line, format: Topic | confidence | status)</Label>
        <Textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder={`Deadlocks | 2 | TODO\nBanker Algorithm | 1 | DOING\nMemory Management | 4 | DONE`} rows={3} />
        <Button type="button" size="sm" variant="outline" onClick={handleBulkAdd} disabled={!bulkInput.trim()}>Add from bulk</Button>
      </div>

      <Button type="submit" disabled={isSubmitting || !subject.trim() || !examDate} className="w-full">
        {isSubmitting ? "Creating..." : "Create Exam + Countdown"}
      </Button>

      <p className="text-[11px] text-muted-foreground">Syllabus stored as JSON [{`{ topic, confidence 1-5, status }`}]. Countdown shows days/h/m/s. AI study plan backwards from exam date based on available hours & weakness, revision scheduler 1,3,7,14 days spaced repetition, mock-test log with chart.</p>
    </form>
  )
}

function SelectWrapper({ value, onChange, options }: { value: any; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-md border px-2 text-sm bg-background">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
