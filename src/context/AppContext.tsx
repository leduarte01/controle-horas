import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, Employee } from '../types'
import { appReducer } from './reducer'
import type { AppAction } from './reducer'

const DEFAULT_STATE: AppState = {
  employees: [], entries: {}, collectiveVacations: [], individualVacations: [],
  view: 'dashboard', selMonth: new Date().getMonth(), selYear: new Date().getFullYear(), selEmpId: null,
}

interface AppContextValue { state: AppState; dispatch: React.Dispatch<AppAction>; isLoading: boolean }
const AppContext = createContext<AppContextValue>(null!)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, DEFAULT_STATE)
  const [isLoading, setIsLoading] = useState(true)

  // Carrega dados da API ao montar
  useEffect(() => {
    fetch('/api/state')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any) => {
        if (d && d.employees) {
          const employees: Employee[] = d.employees || []
          dispatch({
            type: 'LOAD_STATE',
            payload: {
              employees,
              entries: d.entries || {},
              collectiveVacations: d.collectiveVacations || [],
              individualVacations: d.individualVacations || [],
              selEmpId: employees.length > 0 ? employees[0].id : null,
            },
          })
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  // Persiste na API a cada mudança (ignora enquanto carrega)
  useEffect(() => {
    if (isLoading) return
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees: state.employees,
        entries: state.entries,
        collectiveVacations: state.collectiveVacations,
        individualVacations: state.individualVacations,
      }),
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.employees, state.entries, state.collectiveVacations, state.individualVacations])

  return <AppContext.Provider value={{ state, dispatch, isLoading }}>{children}</AppContext.Provider>
}

export function useAppContext() { return useContext(AppContext) }
