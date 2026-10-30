import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2"><WifiOff className="h-6 w-6" /> Offline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>You are currently offline.</p>
          <p>FocusTrack PWA shell is cached – you can still view dashboard, tasks (cached), and timers (localStorage).</p>
          <p>News, contests, and AI features require internet and will sync when back online.</p>
          <p className="text-xs">Service Worker: focustrack-v1 • Cache: dashboard, cp, academic, vibe, /</p>
        </CardContent>
      </Card>
    </div>
  )
}
