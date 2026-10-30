export type Track = "CP" | "ACADEMIC" | "VIBE"

export interface TaskDTO {
  id: string
  track: Track
  title: string
  status: "TODO" | "DOING" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueAt?: string
}

export interface ContestDTO {
  platform: "CODEFORCES" | "CODECHEF"
  externalId: string
  name: string
  startTime: string
  durationSec: number
  url: string
  phase: string
}

export interface UserProfile {
  displayName?: string
  timezone: string
  codeforcesHandle?: string
  codechefHandle?: string
  weeklyTargetHours: number
}
