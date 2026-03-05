import type { Employee, EntriesMap, CollectiveVacation, IndividualVacation, WorkDay, MonthlyTotals, VacationMatch, DaySchedule } from '../types'
import { isoDate, getHolidays } from './dates'
import { calcDayTotal, calcHours } from './time'

export function entryKey(empId: string, dateStr: string) { return `${empId}|${dateStr}` }
export function getEntry(entries: EntriesMap, empId: string, dateStr: string) { return entries[entryKey(empId, dateStr)] }

export function isOnVacation(empId: string, dateStr: string, collective: CollectiveVacation[], individual: IndividualVacation[]): VacationMatch | null {
  for (const v of collective) if (dateStr >= v.startDate && dateStr <= v.endDate) return { ...v, kind: 'collective' }
  for (const v of individual) if (v.empId === empId && dateStr >= v.startDate && dateStr <= v.endDate) return { ...v, kind: 'individual' }
  return null
}

export function empDaySchedule(emp: Employee, dow: number): DaySchedule {
  if (emp.scheduleType === 'variable' && emp.weekSchedule) {
    const s = emp.weekSchedule[dow as 1|2|3|4|5]
    if (s) return { entry: s.entry || '08:00', exit: s.exit || '17:00', lunch: Number(s.lunch) || 0 }
  }
  return { entry: emp.entry || '08:00', exit: emp.exit || '17:00', lunch: Number(emp.lunch) || 0 }
}

export function getWorkDays(emp: Employee, year: number, month: number, entries: EntriesMap, collective: CollectiveVacation[], individual: IndividualVacation[]): WorkDay[] {
  const days: WorkDay[] = []
  const total = new Date(year, month + 1, 0).getDate()
  const holidays = getHolidays(year)
  for (let d = 1; d <= total; d++) {
    const dt = new Date(year, month, d)
    const dow = dt.getDay()
    if (dow === 0) continue
    if (dow === 6) {
      const dateStr = isoDate(dt)
      const ov = getEntry(entries, emp.id, dateStr)
      if (!ov?.satWork) continue
      days.push({ date: dt, dateStr, isSaturday: true, defEntry: emp.satEntry || '08:00', defExit: emp.satExit || '12:00', defLunch: 0, vacation: isOnVacation(emp.id, dateStr, collective, individual), holiday: holidays.get(dateStr) ?? null })
    } else {
      const dateStr = isoDate(dt)
      const sch = empDaySchedule(emp, dow)
      days.push({ date: dt, dateStr, isSaturday: false, defEntry: sch.entry, defExit: sch.exit, defLunch: sch.lunch, vacation: isOnVacation(emp.id, dateStr, collective, individual), holiday: holidays.get(dateStr) ?? null })
    }
  }
  return days
}

export function monthlyTotals(emp: Employee, year: number, month: number, entries: EntriesMap, collective: CollectiveVacation[], individual: IndividualVacation[]): MonthlyTotals {
  const days = getWorkDays(emp, year, month, entries, collective, individual)
  let totalH = 0, daysWorked = 0
  for (const d of days) {
    if (d.vacation || d.holiday) continue
    const ov = getEntry(entries, emp.id, d.dateStr)
    if (ov?.absent) continue
    totalH += calcDayTotal(d.defEntry, d.defExit, d.defLunch, ov)
    daysWorked++
  }
  const vacationDays = days.filter(d => d.vacation).length
  const holidayDays = days.filter(d => !d.vacation && d.holiday).length
  const totalValue = emp.paymentType === 'monthly' ? (emp.monthlySalary || 0) : totalH * (emp.rate || 0)
  return { totalH, totalValue, daysWorked, scheduledDays: days.length - vacationDays - holidayDays, vacationDays, holidayDays, conductionTotal: (emp.vtValue || 0) * daysWorked }
}

export function countWorkingDays(year: number, month: number): number {
  const total = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= total; d++) { const dow = new Date(year, month, d).getDay(); if (dow !== 0 && dow !== 6) count++ }
  return count
}

export { calcHours }
