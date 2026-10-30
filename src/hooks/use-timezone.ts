"use client"
import { useEffect, useState } from "react"

export function useTimezone() {
  const [timezone, setTimezone] = useState<string>("UTC")

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) setTimezone(tz)
    } catch {}
  }, [])

  return timezone
}

export function useLocalTime(updateMs = 1000) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), updateMs)
    return () => clearInterval(id)
  }, [updateMs])
  return now
}
