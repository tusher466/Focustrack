import { PrismaClient, Track, TaskStatus, TaskPriority } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clean existing demo data if any
  // Note: In production seed should be idempotent
  const demoEmail = "demo@focustrack.dev"

  let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Demo User",
        emailVerified: new Date(),
      },
    })
    console.log("Created demo user:", demoUser.id)
  }

  // Profile
  await prisma.profile.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      displayName: "Demo Student",
      bio: "Aspiring competitive programmer & full-stack dev. FocusTrack early adopter.",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      codeforcesHandle: "tourist",
      codechefHandle: "demo",
      weeklyTargetHours: 15,
      goals: {
        cp: "Reach 1600 on Codeforces",
        academic: "Ace DSA and OS exams",
        vibe: "Build 3 AI-powered apps",
      },
    },
  })

  // Progress
  for (const track of [Track.CP, Track.ACADEMIC, Track.VIBE]) {
    await prisma.userProgress.upsert({
      where: { userId_track: { userId: demoUser.id, track } },
      update: {},
      create: {
        userId: demoUser.id,
        track,
        xp: track === Track.CP ? 250 : track === Track.VIBE ? 120 : 80,
        level: track === Track.CP ? 3 : 2,
        streakDays: 5,
        lastActiveDate: new Date(),
      },
    })
  }

  // Tasks
  const existingTasks = await prisma.task.count({ where: { userId: demoUser.id } })
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          userId: demoUser.id,
          track: Track.CP,
          title: "Learn Binary Search - CSES & CP-Algos",
          notes: "Read cp-algorithms binary search, solve CSES Searching & Sorting",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          estimateMin: 90,
          tags: ["binary-search", "cses"],
          dueAt: new Date(Date.now() + 86400000),
        },
        {
          userId: demoUser.id,
          track: Track.CP,
          title: "Codeforces Round #1800 - Virtual",
          notes: "Attempt div2 problems, focus on 2-pointer",
          status: TaskStatus.DOING,
          priority: TaskPriority.HIGH,
          estimateMin: 120,
          tags: ["contest", "virtual"],
        },
        {
          userId: demoUser.id,
          track: Track.ACADEMIC,
          title: "OS Chapter 4 - Deadlocks",
          notes: "Active recall notes, make flashcards",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          estimateMin: 60,
          tags: ["OS", "exam"],
          dueAt: new Date(Date.now() + 2 * 86400000),
        },
        {
          userId: demoUser.id,
          track: Track.VIBE,
          title: "Complete Lesson 2 - Context & Constraints",
          notes: "Exercise: Rewrite vague prompt with constraints",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          estimateMin: 30,
          tags: ["prompting"],
        },
      ],
    })
  }

  // Contests sample
  const contestCount = await prisma.contest.count()
  if (contestCount === 0) {
    const now = new Date()
    await prisma.contest.createMany({
      data: [
        {
          platform: "CODEFORCES",
          externalId: "9999",
          name: "Codeforces Round #999 (Div. 2)",
          startTime: new Date(now.getTime() + 2 * 86400000),
          durationSec: 7200,
          url: "https://codeforces.com/contests",
          phase: "BEFORE",
        },
        {
          platform: "CODECHEF",
          externalId: "START200",
          name: "Starters 200",
          startTime: new Date(now.getTime() + 3 * 86400000),
          durationSec: 7200,
          url: "https://www.codechef.com/contests",
          phase: "BEFORE",
        },
      ],
    })
  }

  // News sample
  const newsCount = await prisma.newsItem.count()
  if (newsCount === 0) {
    await prisma.newsItem.createMany({
      data: [
        {
          source: "Hacker News",
          title: "Show HN: FocusTrack - Open Source Productivity for Devs",
          url: "https://example.com/hn1-" + Date.now(),
          publishedAt: new Date(),
          summary: "A new productivity app focused on CP, Academia and Vibe Coding.",
          tags: ["Web", "Open Source"],
        },
        {
          source: "dev.to",
          title: "10 Prompt Engineering Techniques That Actually Work",
          url: "https://example.com/devto1-" + Date.now(),
          publishedAt: new Date(Date.now() - 3600000),
          summary: "Learn structured prompting for better AI outputs.",
          tags: ["AI", "Web"],
        },
      ],
    })
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
