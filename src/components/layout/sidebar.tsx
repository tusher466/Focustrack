"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Code2,
  GraduationCap,
  Sparkles,
  Newspaper,
  Calendar as CalendarIcon,
  Timer,
  User,
  BookOpenCheck,
  Trophy,
} from "lucide-react"

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  accent?: string
  badge?: string
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "CP Track", href: "/cp", icon: Code2, accent: "text-blue-500", badge: "CP" },
  { title: "Academic", href: "/academic", icon: GraduationCap, accent: "text-emerald-500", badge: "ACAD" },
  { title: "Vibe Coding", href: "/vibe", icon: Sparkles, accent: "text-purple-500", badge: "VIBE" },
  { title: "Tech News", href: "/news", icon: Newspaper },
  { title: "Exams", href: "/exams", icon: BookOpenCheck },
  { title: "Calendar", href: "/calendar", icon: CalendarIcon },
  { title: "Focus", href: "/focus", icon: Timer },
  { title: "Profile", href: "/profile", icon: User },
]

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()

  return (
    <aside className={cn("flex h-screen flex-col border-r bg-card", collapsed ? "w-[70px]" : "w-[260px]", "transition-all duration-200")}>
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">FocusTrack</span>
            <span className="text-[10px] text-muted-foreground">BUILD • LEARN • SHIP</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                item.accent && isActive ? item.accent : ""
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", item.accent)} />
              {!collapsed && <span className="flex-1">{item.title}</span>}
              {!collapsed && item.badge && (
                <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        {!collapsed && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-semibold">3 Tracks, 1 Focus</p>
            <p className="mt-1 text-[11px] text-muted-foreground">CP = blue • Academic = green • Vibe = purple</p>
            <div className="mt-2 flex gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="h-2 w-2 rounded-full bg-purple-600" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
