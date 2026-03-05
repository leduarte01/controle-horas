import type { DayEntry } from '../types'

export function timeToMin(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function calcHours(entry: string, exit: string, lunchMin = 0): number {
  if (!entry || !exit) return 0
  const diff = timeToMin(exit) - timeToMin(entry) - lunchMin
  return Math.max(0, diff) / 60
}
export function calcDayTotal(defEntry: string, defExit: string, defLunch: number, ov: DayEntry | undefined): number {
  if (!ov) return calcHours(defEntry, defExit, defLunch)
  if (ov.absent) return 0
  const e = ov.entry || defEntry
  const x = ov.exit || defExit
  const l = ov.lunch !== undefined ? ov.lunch : defLunch
  let total = calcHours(e, x, l)
  if (ov.extras) for (const ex of ov.extras) total += calcHours(ex.entry, ex.exit, 0)
  return total
}
