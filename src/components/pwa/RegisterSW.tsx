"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Bell, WifiOff, Check } from "lucide-react"

export function RegisterSW() {
  const [isSupported, setIsSupported] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default")
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      setIsSupported(true)
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] SW registered", reg.scope))
        .catch((err) => console.warn("[PWA] SW registration failed", err))
    }

    if ("Notification" in window) {
      setNotifPermission(Notification.permission as any)
    } else {
      setNotifPermission("unsupported")
    }

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOffline(!navigator.onLine)

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener("appinstalled", handleAppInstalled)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log("[PWA] Install outcome", outcome)
    setDeferredPrompt(null)
  }

  const handleRequestNotification = async () => {
    if (!("Notification" in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm as any)
    if (perm === "granted") {
      new Notification("FocusTrack Notifications Enabled", {
        body: "You'll receive contest and timer alerts!",
        icon: "/icon-192.png",
      })
      // Also notify SW
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SHOW_NOTIFICATION", title: "Test via SW", body: "SW notification works!", url: "/dashboard" })
      }
    }
  }

  // Don't show if not supported? Show minimal anyway for demo
  if (!isSupported && notifPermission === "unsupported") return null

  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={isOffline ? "destructive" : "secondary"} className="text-[11px]">{isOffline ? <><WifiOff className="h-3 w-3 mr-1" /> Offline Shell Ready</> : "Online"}</Badge>
          {isInstalled && <Badge className="bg-emerald-600 text-white text-[11px]"><Check className="h-3 w-3 mr-1" /> Installed PWA</Badge>}
          <span className="text-xs text-muted-foreground">PWA installable, offline shell via SW, Web Notifications for contest/timer</span>
        </div>
        <div className="flex gap-1">
          {deferredPrompt && !isInstalled && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleInstall}><Download className="h-3 w-3 mr-1" /> Install App</Button>
          )}
          {notifPermission !== "granted" && notifPermission !== "unsupported" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRequestNotification}><Bell className="h-3 w-3 mr-1" /> Enable Notifications</Button>
          )}
          {notifPermission === "granted" && <Badge variant="outline" className="text-[11px]"><Bell className="h-3 w-3 mr-1" /> Notifications ON</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}
