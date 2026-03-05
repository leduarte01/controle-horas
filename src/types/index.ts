export type ViewName = 'dashboard' | 'employees' | 'hours' | 'reports' | 'vacations'

export interface DaySchedule { entry: string; exit: string; lunch: number }
export type WeekSchedule = { [dow in 1 | 2 | 3 | 4 | 5]: DaySchedule }

export interface Employee {
  id: string; name: string
  scheduleType: 'fixed' | 'variable'
  entry: string; exit: string; lunch: number
  weekSchedule: WeekSchedule | null
  satEntry: string; satExit: string
  paymentType: 'hourly' | 'monthly'
  rate: number; monthlySalary: number; vtValue: number
}

export interface ExtraPeriod { id: string; entry: string; exit: string; note: string }
export interface DayEntry {
  entry?: string; exit?: string; lunch?: number
  absent?: boolean; satWork?: boolean
  extras?: ExtraPeriod[]
}
export type EntriesMap = Record<string, DayEntry>

export interface CollectiveVacation { id: string; startDate: string; endDate: string; note: string }
export interface IndividualVacation { id: string; empId: string; startDate: string; endDate: string; note: string }
export type VacationMatch =
  | (CollectiveVacation & { kind: 'collective' })
  | (IndividualVacation & { kind: 'individual' })

export interface WorkDay {
  date: Date; dateStr: string; isSaturday: boolean
  defEntry: string; defExit: string; defLunch: number
  vacation: VacationMatch | null; holiday: string | null
}

export interface MonthlyTotals {
  totalH: number; totalValue: number; daysWorked: number
  scheduledDays: number; vacationDays: number; holidayDays: number
  conductionTotal: number
}

export interface AppState {
  employees: Employee[]; entries: EntriesMap
  collectiveVacations: CollectiveVacation[]; individualVacations: IndividualVacation[]
  view: ViewName; selMonth: number; selYear: number; selEmpId: string | null
}

export type ToastType = 'success' | 'error' | 'warning'
export interface ToastItem { id: string; message: string; type: ToastType }
