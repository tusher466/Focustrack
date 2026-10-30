"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export function MockTestChart({ mockTests }: { mockTests: { date: string; score: number; total: number }[] }) {
  if (!mockTests || mockTests.length === 0) {
    return <p className="text-xs text-muted-foreground border border-dashed rounded p-4 text-center">No mock tests yet. Log scores to see trend chart.</p>
  }

  const data = mockTests.map((t) => ({
    date: new Date(t.date).toLocaleDateString(),
    score: t.score,
    percent: Math.round((t.score / t.total) * 100),
    total: t.total,
  }))

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Mock Test Score Trend</CardTitle></CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis fontSize={10} domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Score" />
            <Line type="monotone" dataKey="percent" stroke="#10b981" strokeWidth={2} name="% " />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
