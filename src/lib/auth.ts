import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Email from "next-auth/providers/nodemailer"
import { db } from "./db"
import { getEnv } from "./env"

const env = getEnv()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    ...(env.EMAIL_SERVER && env.EMAIL_FROM
      ? [
          Email({
            server: env.EMAIL_SERVER,
            from: env.EMAIL_FROM,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id
      }
      // Allow updating timezone etc via session update
      if (trigger === "update" && session) {
        // custom fields
        return { ...token, ...session }
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // Create profile and progress
      if (!user.id) return
      const timezone = "UTC"
      await db.profile.create({
        data: {
          userId: user.id,
          displayName: user.name || null,
          avatar: user.image || null,
          timezone,
        },
      })
      // Create progress for each track
      await db.userProgress.createMany({
        data: [
          { userId: user.id, track: "CP", level: 1, xp: 0 },
          { userId: user.id, track: "ACADEMIC", level: 1, xp: 0 },
          { userId: user.id, track: "VIBE", level: 1, xp: 0 },
        ],
        skipDuplicates: true,
      })
    },
  },
})

// Helper for route handlers
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }
  return session.user
}
