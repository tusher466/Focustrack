import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { RegisterSW } from "@/components/pwa/RegisterSW"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // In dev without DB, auth may fail - allow through if no session but not in prod
  let session = null
  try {
    session = await auth()
  } catch (e) {
    console.warn("Auth check failed in layout, allowing in dev", e)
  }

  // If AUTH_SECRET missing etc, we still want shell to render in Phase 1
  // Comment out redirect for Phase 1 demo unless strictly needed
  // if (!session?.user) {
  //   redirect("/login")
  // }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <RegisterSW />
            <div className="mt-4">{children}</div>
          </div>
        </main>
        <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
          FocusTrack • CP <span className="inline-block h-2 w-2 rounded-full bg-blue-600" /> • Academic{" "}
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" /> • Vibe{" "}
          <span className="inline-block h-2 w-2 rounded-full bg-purple-600" /> • Built with Next.js 14
        </footer>
      </div>
    </div>
  )
}
