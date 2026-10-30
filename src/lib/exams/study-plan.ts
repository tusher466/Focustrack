export type SyllabusTopic = {
  topic: string
  confidence: number // 1-5, 1 = weakest
  status: "TODO" | "DOING" | "DONE"
}

export type StudyPlanItemInput = {
  date: Date
  topic: string
  durationMin: number
  type: "learn" | "revision" | "mock"
}

export function generateStudyPlanBackwards({
  examDate,
  syllabusTopics,
  availableHoursPerDay,
  startDate = new Date(),
}: {
  examDate: Date
  syllabusTopics: SyllabusTopic[]
  availableHoursPerDay: number // e.g., 2-4 hours
  startDate?: Date
}): StudyPlanItemInput[] {
  // Sort topics by weakness: confidence 1 first, then 2, etc, and TODO before DONE
  const sorted = [...syllabusTopics].sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence - b.confidence
    const statusOrder = { TODO: 0, DOING: 1, DONE: 2 }
    return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
  })

  const plan: StudyPlanItemInput[] = []
  const totalDays = Math.max(1, Math.ceil((examDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const topicsPerDay = Math.ceil(sorted.length / Math.max(1, totalDays - 2)) // leave last 2 days for full revision

  // Distribute topics backwards from exam date
  let topicIndex = 0
  for (let d = totalDays - 1; d >= 0; d--) {
    const date = new Date(examDate)
    date.setDate(date.getDate() - (totalDays - 1 - d))
    if (date < startDate) continue

    // Last 2 days = full revision + mock
    if (d >= totalDays - 2) {
      plan.push({
        date,
        topic: d === totalDays - 1 ? "Full Syllabus Revision + Mock Test" : "Weak Topics Revision",
        durationMin: availableHoursPerDay * 60,
        type: d === totalDays - 1 ? "mock" : "revision",
      })
      continue
    }

    // Allocate topics for this day
    const remaining = sorted.length - topicIndex
    if (remaining <= 0) {
      // No new topics, add revision of random weak topic using spaced repetition
      const weak = sorted.filter((t) => t.confidence <= 3)[0]
      if (weak) {
        plan.push({ date, topic: `Revision: ${weak.topic}`, durationMin: Math.round(availableHoursPerDay * 60 * 0.6), type: "revision" })
      }
      continue
    }

    const countToday = Math.min(topicsPerDay, remaining)
    for (let i = 0; i < countToday; i++) {
      const topic = sorted[topicIndex]
      if (!topic) break
      // Duration based on confidence: weaker needs more time
      const confidenceFactor = (6 - topic.confidence) / 5 // 1->1, 5->0.2
      const durationMin = Math.round(availableHoursPerDay * 60 * (0.5 + confidenceFactor * 0.5) / countToday)
      plan.push({
        date,
        topic: topic.topic,
        durationMin: Math.max(30, durationMin),
        type: "learn",
      })
      topicIndex++
    }

    // Add spaced repetition revision for topics learned earlier
    // For demo, add one revision from 1,3,7 days ago if exists
    if (plan.length > 3) {
      // Simple: pick topic from 3 days ago
      const pastIndex = plan.length - 3 - Math.floor(Math.random() * 2)
      if (pastIndex >= 0 && plan[pastIndex]) {
        const pastTopic = plan[pastIndex].topic
        if (!pastTopic.includes("Revision") && !pastTopic.includes("Mock")) {
          plan.push({
            date,
            topic: `Spaced Revision (3d): ${pastTopic}`,
            durationMin: 30,
            type: "revision",
          })
        }
      }
    }
  }

  // Now add spaced repetition intervals 1,3,7,14 days forward for each learn item
  const revisionPlan: StudyPlanItemInput[] = []
  for (const item of plan.filter((p) => p.type === "learn")) {
    const intervals = [1, 3, 7, 14]
    for (const interval of intervals) {
      const revDate = new Date(item.date)
      revDate.setDate(revDate.getDate() + interval)
      if (revDate >= examDate) continue // don't schedule after exam
      if (revDate <= new Date()) continue // don't schedule in past? but we can still
      revisionPlan.push({
        date: revDate,
        topic: `Spaced Repetition (${interval}d): ${item.topic}`,
        durationMin: 30,
        type: "revision",
      })
    }
  }

  const combined = [...plan, ...revisionPlan].sort((a, b) => a.date.getTime() - b.date.getTime())
  return combined
}

export function calculateCountdown(target: Date): { days: number; hours: number; minutes: number; seconds: number; isPast: boolean } {
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  const isPast = diff <= 0
  const abs = Math.abs(diff)
  return {
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((abs % (1000 * 60)) / 1000),
    isPast,
  }
}
