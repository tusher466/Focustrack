"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useExams, useCreateExam, useGenerateStudyPlan, useToggleStudyPlanItem, useCreateMockTest } from "@/hooks/use-exams"
import { ExamForm } from "@/components/exams/ExamForm"
import { ExamCard } from "@/components/exams/ExamCard"
import { MockTestChart } from "@/components/exams/MockTestChart"
import { Plus, BookOpen, Calendar, Target, CheckCircle, Clock } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useExams()
  const createExam = useCreateExam()
  const generatePlan = useGenerateStudyPlan()
  const toggleItem = useToggleStudyPlanItem()
  const createMock = useCreateMockTest()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [availableHours, setAvailableHours] = useState("3")
  const [mockDate, setMockDate] = useState(new Date().toISOString().split("T")[0])
  const [mockScore, setMockScore] = useState("")
  const [mockTotal, setMockTotal] = useState("100")
  const [mockNotes, setMockNotes] = useState("")

  const selectedExam = exams.find((e) => e.id === selectedExamId)

  const { data: examDetail } = useQuery({
    queryKey: ["exam", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null
      const res = await fetch(`/api/exams/${selectedExamId}`)
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      return json.exam
    },
    enabled: !!selectedExamId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Preparation</h1>
          <p className="text-muted-foreground">Syllabus • Countdown • Study Plan backwards • Spaced repetition 1-3-7-14 • Mock-test trend chart</p>
        </div>
        <div className="flex gap-2">
          <Badge>Phase 7 Live</Badge>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Exam</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Your Exams ({exams.length})</CardTitle>
              <CardDescription className="text-xs">Subject, date, syllabus, countdown to exam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {isLoading ? <p className="text-xs">Loading...</p> : exams.length === 0 ? <p className="text-xs border border-dashed rounded p-4 text-center text-muted-foreground">No exams yet. Create one.</p> : exams.map((exam) => <ExamCard key={exam.id} exam={exam as any} onDelete={async (id) => { await fetch(`/api/exams/${id}`, { method: "DELETE" }); window.location.reload() }} onSelect={setSelectedExamId} />)}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedExam ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Select an exam to view study plan, topic checklist, revision scheduler, mock tests.<br />Create exam with syllabus topics confidence 1-5.</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">{selectedExam.subject} – Study Plan</CardTitle>
                  <CardDescription>AI generates day-by-day backwards from exam date based on daily hours & topic weakness. Spaced repetition 1,3,7,14 days.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Available Hours Per Day</Label>
                      <Input type="number" min={0.5} max={12} step={0.5} value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} />
                    </div>
                    <Button onClick={() => generatePlan.mutate({ examId: selectedExam.id, availableHoursPerDay: parseFloat(availableHours) })} disabled={generatePlan.isPending}>
                      {generatePlan.isPending ? "Generating..." : "Generate Study Plan (Backwards)"}
                    </Button>
                  </div>

                  {examDetail?.items && examDetail.items.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {examDetail.items.map((item: any) => (
                        <div key={item.id} className={`flex items-center justify-between gap-2 text-xs border rounded p-2 ${item.done ? "bg-emerald-50 dark:bg-emerald-950/20 line-through" : ""}`}>
                          <div className="flex-1">
                            <p className="font-medium">{new Date(item.date).toLocaleDateString()} – {item.topic}</p>
                            <p className="text-[11px] text-muted-foreground">{item.durationMin}m • {item.topic.includes("Spaced") || item.topic.includes("Revision") ? "Revision" : item.topic.includes("Mock") ? "Mock" : "Learn"}</p>
                          </div>
                          <Button size="sm" variant={item.done ? "default" : "outline"} className="h-6 text-[11px]" onClick={() => toggleItem.mutate({ examId: selectedExam.id, itemId: item.id, done: !item.done })}>
                            <CheckCircle className="h-3 w-3 mr-1" /> {item.done ? "Done" : "Mark Done"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border border-dashed rounded p-4 text-center">No study plan yet. Click Generate – creates items backwards from exam date, weak topics first, spaced repetition 1,3,7,14 days.</p>
                  )}
                </CardContent>
              </Card>

              {selectedExam && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Syllabus Checklist – Confidence 1-5</CardTitle>
                    <CardDescription className="text-xs">Topic checklist with confidence rating, status TODO/DOING/DONE</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.isArray(selectedExam.syllabusTopics) && selectedExam.syllabusTopics.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs border rounded p-2">
                        <span className="flex-1">{t.topic}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.confidence <= 2 ? "destructive" : t.confidence >= 4 ? "secondary" : "outline"}>Conf: {t.confidence}/5 {t.confidence <= 2 ? "Weak" : t.confidence >= 4 ? "Strong" : ""}</Badge>
                          <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Mock Tests – Score Trend Chart</CardTitle>
                  <CardDescription className="text-xs">Log mock tests with date, score, total. Recharts line chart trend.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={mockDate} onChange={(e) => setMockDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Score</Label>
                      <Input type="number" value={mockScore} onChange={(e) => setMockScore(e.target.value)} placeholder="75" />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <Input type="number" value={mockTotal} onChange={(e) => setMockTotal(e.target.value)} placeholder="100" />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" className="w-full" onClick={() => { if (!mockScore) return; createMock.mutate({ examId: selectedExam.id, date: new Date(mockDate).toISOString(), score: parseInt(mockScore), total: parseInt(mockTotal) || 100, notes: mockNotes }); setMockScore(""); }} disabled={!mockScore}>Add Mock</Button>
                    </div>
                  </div>
                  <Input placeholder="Notes (optional)" value={mockNotes} onChange={(e) => setMockNotes(e.target.value)} />

                  {examDetail?.mockTests ? <MockTestChart mockTests={examDetail.mockTests} /> : selectedExam.mockTests ? <MockTestChart mockTests={selectedExam.mockTests as any} /> : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Exam – Countdown & Syllabus</DialogTitle></DialogHeader>
          <ExamForm onSubmit={async (data) => { await createExam.mutateAsync(data); setIsCreateOpen(false) }} isSubmitting={createExam.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
