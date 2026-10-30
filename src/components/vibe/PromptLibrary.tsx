"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { usePromptLibrary, useCreatePrompt, useUpdatePrompt, useDeletePrompt } from "@/hooks/use-vibe"
import { Plus, Trash2, Star, XCircle, Edit, Save, Copy } from "lucide-react"

export function PromptLibrary() {
  const { data: prompts = [], isLoading } = usePromptLibrary()
  const create = useCreatePrompt()
  const update = useUpdatePrompt()
  const remove = useDeletePrompt()

  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [rating, setRating] = useState<"WORKED" | "DIDNT_WORK" | "">("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState("")

  const handleCreate = async () => {
    if (!title.trim() || !prompt.trim()) return
    await create.mutateAsync({
      title: title.trim(),
      prompt: prompt.trim(),
      rating: rating || null,
      notes: notes.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    })
    setTitle("")
    setPrompt("")
    setRating("")
    setNotes("")
    setTags("")
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">Prompt Library – Save your prompts with rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My best sorting prompt" />
            </div>
            <div className="space-y-1">
              <Label>Rating</Label>
              <Select value={rating} onValueChange={(v: any) => setRating(v)}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WORKED">✅ Worked</SelectItem>
                  <SelectItem value="DIDNT_WORK">❌ Didn&apos;t work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Prompt *</Label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paste prompt..." rows={3} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why it worked / didn't..." />
            </div>
            <div className="space-y-1">
              <Label>Tags (comma)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sorting, ts" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending || !title.trim() || !prompt.trim()} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Save Prompt (+3 XP)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Saved Prompts ({prompts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : prompts.length === 0 ? (
            <p className="text-xs text-muted-foreground border border-dashed rounded p-4 text-center">No saved prompts yet. Save your first prompt above.</p>
          ) : (
            prompts.map((p) => (
              <div key={p.id} className="border rounded p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.rating === "WORKED" ? <Badge className="bg-emerald-600 text-white text-[10px]"><Star className="h-3 w-3 mr-1" /> Worked</Badge> : p.rating === "DIDNT_WORK" ? <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" /> Didn&apos;t</Badge> : <Badge variant="outline" className="text-[10px]">Unrated</Badge>}
                      {p.tags.map((tag) => <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">#{tag}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(p.prompt)} title="Copy prompt"><Copy className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(p.id); setEditNotes(p.notes || "") }}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => remove.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap max-h-24 overflow-y-auto">{p.prompt}</pre>
                {p.notes && <p className="text-xs text-muted-foreground">Notes: {p.notes}</p>}
                {editingId === p.id && (
                  <div className="flex gap-2">
                    <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Update notes" className="flex-1" />
                    <Button size="sm" onClick={() => { update.mutate({ id: p.id, notes: editNotes }); setEditingId(null) }}><Save className="h-3 w-3 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
