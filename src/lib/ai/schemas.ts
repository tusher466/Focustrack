import { z } from "zod"

export const CpAnalyserOutputSchema = z.object({
  verdict: z.enum(["on_track", "needs_adjustment", "off_track"]),
  summary: z.string().min(10),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  next7Days: z.array(
    z.object({
      day: z.string(),
      topic: z.string(),
      targetRating: z.number().int().min(800).max(3500),
      reason: z.string(),
    })
  ),
  resources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      type: z.enum(["article", "video", "problemset", "course"]),
      why: z.string(),
    })
  ),
  warnings: z.array(z.string()),
})

export const AcademicGuideOutputSchema = z.object({
  workloadAssessment: z.string(),
  prioritisedPlan: z.array(
    z.object({
      subject: z.string(),
      topic: z.string(),
      due: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]),
      reason: z.string(),
    })
  ),
  studyTechniques: z.array(
    z.object({
      technique: z.string(),
      howToApply: z.string(),
    })
  ),
  risks: z.array(z.string()),
  weeklySchedule: z.array(
    z.object({
      day: z.string(),
      blocks: z.array(
        z.object({
          time: z.string(),
          subject: z.string(),
          activity: z.string(),
        })
      ),
    })
  ),
})

export const PromptReviewOutputSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  improvedPrompt: z.string().min(10),
  tips: z.array(z.string()),
})

export const DailyLessonOutputSchema = z.object({
  title: z.string().min(5),
  concept: z.string().min(20),
  badPromptExample: z.string().min(10),
  goodPromptExample: z.string().min(10),
  exercise: z.string().min(10),
  buildChallenge: z.string().min(10),
  level: z.number().int().min(1).max(7),
})
