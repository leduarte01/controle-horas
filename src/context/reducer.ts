import type { AppState, Employee, DayEntry, CollectiveVacation, IndividualVacation, ViewName } from '../types'

export type AppAction =
  | { type: 'NAVIGATE'; payload: ViewName }
  | { type: 'SET_SEL_MONTH'; payload: number }
  | { type: 'SET_SEL_YEAR'; payload: number }
  | { type: 'SET_SEL_EMP'; payload: string | null }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'SET_ENTRY'; payload: { empId: string; dateStr: string; data: DayEntry } }
  | { type: 'DELETE_ENTRY'; payload: { empId: string; dateStr: string } }
  | { type: 'ADD_COLLECTIVE_VAC'; payload: CollectiveVacation }
  | { type: 'UPDATE_COLLECTIVE_VAC'; payload: CollectiveVacation }
  | { type: 'DELETE_COLLECTIVE_VAC'; payload: string }
  | { type: 'ADD_INDIVIDUAL_VAC'; payload: IndividualVacation }
  | { type: 'UPDATE_INDIVIDUAL_VAC'; payload: IndividualVacation }
  | { type: 'DELETE_INDIVIDUAL_VAC'; payload: string }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':      return { ...state, view: action.payload }
    case 'SET_SEL_MONTH': return { ...state, selMonth: action.payload }
    case 'SET_SEL_YEAR':  return { ...state, selYear: action.payload }
    case 'SET_SEL_EMP':   return { ...state, selEmpId: action.payload }
    case 'ADD_EMPLOYEE':  return { ...state, employees: [...state.employees, action.payload] }
    case 'UPDATE_EMPLOYEE': return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) }
    case 'DELETE_EMPLOYEE': {
      const id = action.payload
      const newEntries = Object.fromEntries(Object.entries(state.entries).filter(([k]) => !k.startsWith(id + '|')))
      return { ...state, employees: state.employees.filter(e => e.id !== id), entries: newEntries, individualVacations: state.individualVacations.filter(v => v.empId !== id), selEmpId: state.selEmpId === id ? null : state.selEmpId }
    }
    case 'SET_ENTRY': {
      const key = `${action.payload.empId}|${action.payload.dateStr}`
      return { ...state, entries: { ...state.entries, [key]: action.payload.data } }
    }
    case 'DELETE_ENTRY': {
      const key = `${action.payload.empId}|${action.payload.dateStr}`
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _r, ...rest } = state.entries
      return { ...state, entries: rest }
    }
    case 'ADD_COLLECTIVE_VAC': return { ...state, collectiveVacations: [...state.collectiveVacations, action.payload] }
    case 'UPDATE_COLLECTIVE_VAC': return { ...state, collectiveVacations: state.collectiveVacations.map(v => v.id === action.payload.id ? action.payload : v) }
    case 'DELETE_COLLECTIVE_VAC': return { ...state, collectiveVacations: state.collectiveVacations.filter(v => v.id !== action.payload) }
    case 'ADD_INDIVIDUAL_VAC': return { ...state, individualVacations: [...state.individualVacations, action.payload] }
    case 'UPDATE_INDIVIDUAL_VAC': return { ...state, individualVacations: state.individualVacations.map(v => v.id === action.payload.id ? action.payload : v) }
    case 'DELETE_INDIVIDUAL_VAC': return { ...state, individualVacations: state.individualVacations.filter(v => v.id !== action.payload) }
    case 'LOAD_STATE': return { ...state, ...action.payload }
    default: return state
  }
}
