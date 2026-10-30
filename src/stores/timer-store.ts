"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

// Stopwatch store – uses timestamps, survives refresh via localStorage, sync to FocusSession on completion
interface StopwatchState {
  isRunning: boolean
  startTime: number | null // timestamp when started
  elapsedMs: number // accumulated elapsed when not running + current
  _lastTick: number | null
  start: () => void
  stop: () => void
  reset: () => void
  tick: () => void
}

export const useStopwatchStore = create<StopwatchState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      startTime: null,
      elapsedMs: 0,
      _lastTick: null,
      start: () => {
        const now = Date.now()
        set({ isRunning: true, startTime: now, _lastTick: now })
      },
      stop: () => {
        const { startTime, elapsedMs, isRunning } = get()
        if (!isRunning || !startTime) return
        const now = Date.now()
        const delta = now - startTime
        set({ isRunning: false, startTime: null, elapsedMs: elapsedMs + delta, _lastTick: null })
      },
      reset: () => set({ isRunning: false, startTime: null, elapsedMs: 0, _lastTick: null }),
      tick: () => {
        const { isRunning, startTime, elapsedMs, _lastTick } = get()
        if (!isRunning || !startTime) return
        const now = Date.now()
        // Use timestamp drift-free: elapsed = previous elapsed + (now - startTime)
        // But to avoid setInterval drift, we recompute each tick from startTime
        // Keep _lastTick for potential future use
        set({ _lastTick: now })
      },
    }),
    { name: "focustrack:stopwatch" }
  )
)

// Countdown store – target date/time, e.g., exam or contest
interface CountdownState {
  target: string | null // ISO string
  label: string
  isRunning: boolean
  setTarget: (iso: string | null, label?: string) => void
  clear: () => void
}

export const useCountdownStore = create<CountdownState>()(
  persist(
    (set) => ({
      target: null,
      label: "Exam / Contest Countdown",
      isRunning: false,
      setTarget: (iso, label) => set({ target: iso, label: label || "Exam / Contest Countdown", isRunning: !!iso }),
      clear: () => set({ target: null, isRunning: false }),
    }),
    { name: "focustrack:countdown" }
  )
)

// Pomodoro store – 25/5 default configurable, linked to track & optionally task, timestamp-based, survives refresh
type PomodoroMode = "work" | "break" | "longBreak"

interface PomodoroConfig {
  workSec: number
  breakSec: number
  longBreakSec: number
  sessionsBeforeLong: number
}

interface PomodoroState {
  config: PomodoroConfig
  mode: PomodoroMode
  isRunning: boolean
  startTime: number | null
  elapsedSec: number // seconds elapsed in current mode
  totalElapsedSec: number // total for current mode cycle
  sessionsCompleted: number
  linkedTrack: "CP" | "ACADEMIC" | "VIBE" | null
  linkedTaskId: string | null
  setConfig: (cfg: Partial<PomodoroConfig>) => void
  setLinkedTrack: (track: "CP" | "ACADEMIC" | "VIBE" | null) => void
  setLinkedTask: (taskId: string | null) => void
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  completeSession: () => { shouldPlaySound: boolean; nextMode: PomodoroMode }
}

const defaultConfig: PomodoroConfig = { workSec: 25 * 60, breakSec: 5 * 60, longBreakSec: 15 * 60, sessionsBeforeLong: 4 }

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      mode: "work",
      isRunning: false,
      startTime: null,
      elapsedSec: 0,
      totalElapsedSec: 0,
      sessionsCompleted: 0,
      linkedTrack: null,
      linkedTaskId: null,
      setConfig: (cfg) => set({ config: { ...get().config, ...cfg } }),
      setLinkedTrack: (track) => set({ linkedTrack: track }),
      setLinkedTask: (taskId) => set({ linkedTaskId: taskId }),
      start: () => {
        if (get().isRunning) return
        set({ isRunning: true, startTime: Date.now() })
      },
      pause: () => {
        const { startTime, elapsedSec, isRunning } = get()
        if (!isRunning || !startTime) return
        const now = Date.now()
        const deltaSec = Math.floor((now - startTime) / 1000)
        set({ isRunning: false, startTime: null, elapsedSec: elapsedSec + deltaSec })
      },
      reset: () => set({ isRunning: false, startTime: null, elapsedSec: 0, totalElapsedSec: 0, mode: "work" }),
      skip: () => {
        const { mode, sessionsCompleted, config } = get()
        let nextMode: PomodoroMode = "work"
        let nextSessions = sessionsCompleted
        if (mode === "work") {
          nextSessions += 1
          if (nextSessions % config.sessionsBeforeLong === 0) nextMode = "longBreak"
          else nextMode = "break"
        } else {
          nextMode = "work"
        }
        set({ mode: nextMode, isRunning: false, startTime: null, elapsedSec: 0, sessionsCompleted: nextSessions, totalElapsedSec: 0 })
      },
      tick: () => {
        // Called every second, but we compute elapsed from timestamp to avoid drift
        const { isRunning, startTime, elapsedSec } = get()
        if (!isRunning || !startTime) return
        // No state change needed – UI will compute elapsedSec + (now - startTime)/1000
        // We trigger rerender by updating a dummy? Instead we let component calculate live
        // For persist, we don't need to set each second, but we update elapsedSec occasionally via pause/resume logic
        // However to force zustand update, we set same values? We'll just trigger via elapsedSec unchanged but force via set?
        set({ elapsedSec }) // no-op to trigger subscribers if needed, but real elapsed computed in component
      },
      completeSession: () => {
        const { mode, sessionsCompleted, config } = get()
        let nextMode: PomodoroMode = "work"
        let nextSessions = sessionsCompleted
        if (mode === "work") {
          nextSessions += 1
          nextMode = nextSessions % config.sessionsBeforeLong === 0 ? "longBreak" : "break"
        } else {
          nextMode = "work"
        }
        set({ mode: nextMode, isRunning: false, startTime: null, elapsedSec: 0, totalElapsedSec: 0, sessionsCompleted: nextSessions })
        return { shouldPlaySound: true, nextMode }
      },
    }),
    { name: "focustrack:pomodoro" }
  )
)

// World clock store – user timezone + 2 extra selectable zones
interface WorldClockState {
  extraZones: string[]
  addZone: (tz: string) => void
  removeZone: (tz: string) => void
  setZones: (zones: string[]) => void
}

export const useWorldClockStore = create<WorldClockState>()(
  persist(
    (set, get) => ({
      extraZones: ["America/New_York", "Europe/London"],
      addZone: (tz) => {
        const zones = get().extraZones
        if (zones.includes(tz)) return
        if (zones.length >= 2) {
          set({ extraZones: [zones[1], tz] })
        } else {
          set({ extraZones: [...zones, tz] })
        }
      },
      removeZone: (tz) => set({ extraZones: get().extraZones.filter((z) => z !== tz) }),
      setZones: (zones) => set({ extraZones: zones.slice(0, 2) }),
    }),
    { name: "focustrack:worldclock" }
  )
)
