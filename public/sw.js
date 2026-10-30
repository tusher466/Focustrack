// FocusTrack Service Worker – PWA offline shell + cache + notifications
const CACHE_NAME = "focustrack-v1"
const OFFLINE_URLS = ["/", "/dashboard", "/cp", "/academic", "/vibe", "/offline"]

self.addEventListener("install", (event) => {
  console.log("[SW] Install")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS.map((url) => new Request(url, { cache: "reload" }))).catch(() => {
        console.warn("[SW] Failed to cache some offline URLs")
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate")
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting old cache", key)
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  // Skip API and cron
  if (request.url.includes("/api/")) {
    // Network first for API, fallback to cache if offline? For offline shell we serve cached API fallback empty
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses optionally?
          return response
        })
        .catch(() => {
          // Return empty JSON if offline
          return new Response(JSON.stringify({ offline: true }), { headers: { "Content-Type": "application/json" } })
        })
    )
    return
  }

  // For pages, try network first, then cache, then offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache page
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // If not in cache and it's a navigation, show offline page or dashboard
          if (request.mode === "navigate") {
            return caches.match("/dashboard").then((dash) => dash || caches.match("/"))
          }
        })
      })
  )
})

self.addEventListener("push", (event) => {
  console.log("[SW] Push", event)
  const data = event.data ? event.data.json() : { title: "FocusTrack", body: "New notification" }
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click", event)
  event.notification.close()
  const url = event.notification.data?.url || "/dashboard"
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// For timer/contest alerts – handle messages from client
self.addEventListener("message", (event) => {
  console.log("[SW] Message", event.data)
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, url } = event.data
    self.registration.showNotification(title, { body, icon: "/icon-192.png", data: { url: url || "/dashboard" } })
  }
})
