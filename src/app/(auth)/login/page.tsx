import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Github, Mail, Trophy } from "lucide-react"
import Link from "next/link"

export default function LoginPage({ searchParams }: { searchParams: { verify?: string } }) {
  const isVerify = searchParams.verify === "1"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to FocusTrack</h1>
          <p className="text-sm text-muted-foreground">3 tracks, 1 focus. Build, Learn, Ship.</p>
        </div>

        {isVerify ? (
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>A sign-in link has been sent to your email.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Choose your preferred provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                action={async () => {
                  "use server"
                  const { signIn } = await import("@/lib/auth")
                  await signIn("github", { redirectTo: "/dashboard" })
                }}
              >
                <Button type="submit" className="w-full" variant="outline">
                  <Github className="mr-2 h-4 w-4" /> Continue with GitHub
                </Button>
              </form>

              <form
                action={async () => {
                  "use server"
                  const { signIn } = await import("@/lib/auth")
                  await signIn("google", { redirectTo: "/dashboard" })
                }}
              >
                <Button type="submit" className="w-full" variant="outline">
                  <Mail className="mr-2 h-4 w-4" /> Continue with Google
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or for Phase 1 demo</span>
                </div>
              </div>

              <Link href="/dashboard">
                <Button className="w-full">Skip Auth → Go to Dashboard (Dev)</Button>
              </Link>

              <p className="text-[11px] text-muted-foreground text-center">
                By continuing you agree to our Terms. Email magic link uses Nodemailer if configured. Google/GitHub need env vars.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="rounded-lg bg-card border p-4 text-xs">
          <p className="font-semibold">Phase 1 Setup</p>
          <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
            <li>Next.js 14 App Router, TS strict, Tailwind, shadcn/ui</li>
            <li>Prisma PostgreSQL schema complete</li>
            <li>Auth.js providers: Google, GitHub, Email</li>
            <li>App shell: sidebar with track colors, topbar with theme toggle, timezone</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
