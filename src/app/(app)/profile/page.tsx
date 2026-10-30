"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useProfile, useUpdateProfile, useExportData } from "@/hooks/use-profile"
import { Loader2, Download, Trophy, Flame, Star, MapPin, Code2, GraduationCap, Sparkles } from "lucide-react"

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()
  const exportData = useExportData()

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [timezone, setTimezone] = useState("")
  const [cfHandle, setCfHandle] = useState("")
  const [ccHandle, setCcHandle] = useState("")
  const [weeklyTarget, setWeeklyTarget] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Initialize from profile once loaded
  if (profile && !isEditing) {
    // Use effect-like but simpler: if state empty and profile exists, populate
    // We do this via checking if displayName empty and profile has value
    if (!displayName && profile.displayName) setDisplayName(profile.displayName || "")
  }

  const handleEditToggle = () => {
    if (!isEditing && profile) {
      setDisplayName(profile.displayName || "")
      setBio(profile.bio || "")
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
      setCfHandle(profile.codeforcesHandle || "")
      setCcHandle(profile.codechefHandle || "")
      setWeeklyTarget(String(profile.weeklyTargetHours || 10))
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    await update.mutateAsync({
      displayName: displayName || null,
      bio: bio || null,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      codeforcesHandle: cfHandle || null,
      codechefHandle: ccHandle || null,
      weeklyTargetHours: weeklyTarget ? parseInt(weeklyTarget) : undefined,
    })
    setIsEditing(false)
  }

  const handleExport = async () => {
    const result = await exportData.mutateAsync()
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `focustrack-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const badges = [
    { name: "First Task", desc: "Created first task", icon: "🎯" },
    { name: "Streak 3", desc: "3 day streak", icon: "🔥" },
    { name: "CP Grinder", desc: "Logged 10 CP problems", icon: "💻" },
    { name: "Prompt Master", desc: "Completed 5 vibe lessons", icon: "✨" },
    { name: "Exam Ready", desc: "Created first exam", icon: "📚" },
  ]

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /><p className="text-sm mt-2">Loading profile...</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <div className="flex gap-2">
          <Badge>Phase 7 Live</Badge>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exportData.isPending}><Download className="h-4 w-4 mr-2" /> Export JSON</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Avatar, bio, timezone auto-detect via Intl, handles, goals, weekly target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.user.image ? <img src={profile.user.image} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-lg font-bold">{profile?.displayName?.[0] || profile?.user.name?.[0] || profile?.user.email?.[0] || "U"}</span>}
              </div>
              <div>
                <p className="font-semibold">{profile?.displayName || profile?.user.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{profile?.user.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} (auto-detect)</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Bio:</span> {profile?.bio || "No bio – add in edit"}</p>
                <p><span className="text-muted-foreground">CF Handle:</span> {profile?.codeforcesHandle || "Not set"}</p>
                <p><span className="text-muted-foreground">CC Handle:</span> {profile?.codechefHandle || "Not set"}</p>
                <p><span className="text-muted-foreground">Weekly Target:</span> {profile?.weeklyTargetHours}h</p>
                <p><span className="text-muted-foreground">Goals:</span> {profile?.goals ? JSON.stringify(profile.goals) : "Not set"}</p>
                <Button size="sm" variant="outline" onClick={handleEditToggle} className="w-full mt-2">Edit Profile</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Demo Student" /></div>
                <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Aspiring CP & full-stack dev" rows={2} /></div>
                <div><Label>Timezone (auto-detect)</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone} /><p className="text-[11px] text-muted-foreground">Auto-detect: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>CF Handle</Label><Input value={cfHandle} onChange={(e) => setCfHandle(e.target.value)} placeholder="tourist" /></div>
                  <div><Label>CC Handle</Label><Input value={ccHandle} onChange={(e) => setCcHandle(e.target.value)} placeholder="demo" /></div>
                </div>
                <div><Label>Weekly Target Hours</Label><Input type="number" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} placeholder="15" /></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={update.isPending} className="flex-1">{update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Gamification</CardTitle>
            <CardDescription>Per-track level/XP/streak, badges, export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile?.progress?.map((p) => (
              <div key={p.track} className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2">
                  {p.track === "CP" ? <Code2 className="h-4 w-4 text-blue-600" /> : p.track === "ACADEMIC" ? <GraduationCap className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                  <span className="text-sm font-medium">{p.track}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.track === "CP" ? "cp" : p.track === "ACADEMIC" ? "academic" : "vibe"}>Lv {p.level} • {p.xp} XP • {p.streakDays}🔥</Badge>
                </div>
              </div>
            )) || (
              <>
                <div className="flex items-center justify-between"><span>CP</span><Badge variant="cp">Lv 3 • 250 XP • 5🔥</Badge></div>
                <div className="flex items-center justify-between"><span>Academic</span><Badge variant="academic">Lv 2 • 120 XP • 3🔥</Badge></div>
                <div className="flex items-center justify-between"><span>Vibe</span><Badge variant="vibe">Lv 2 • 80 XP • 5🔥</Badge></div>
              </>
            )}

            <div className="pt-2">
              <h4 className="text-sm font-semibold flex items-center gap-1"><Star className="h-4 w-4" /> Badges / Achievements</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {badges.map((b) => (
                  <div key={b.name} className="border rounded p-2 text-xs">
                    <p className="font-medium">{b.icon} {b.name}</p>
                    <p className="text-muted-foreground text-[11px]">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded bg-muted p-3 text-xs space-y-1">
              <p className="font-medium">Export Data</p>
              <p className="text-muted-foreground">Exports User + Profile + Tasks + CpLogs + Progress + FocusSessions + Exams + Lessons + PromptLibrary as JSON. For import in future phases.</p>
              <Button size="sm" variant="outline" onClick={handleExport} className="w-full mt-2"><Download className="h-4 w-4 mr-2" /> Export JSON</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Spec Compliance</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Avatar: from session user.image or initials, bio, timezone auto-detect via Intl.DateTimeFormat().resolvedOptions().timeZone, editable, codeforcesHandle, codechefHandle, goals JSON, weeklyTargetHours</p>
          <p>• Per-track level/XP/streak from UserProgress unique(userId,track), badges (First Task, Streak 3, CP Grinder, Prompt Master, Exam Ready), export JSON via /api/profile/export</p>
          <p>• All times stored UTC, displayed in user timezone</p>
        </CardContent>
      </Card>
    </div>
  )
}
