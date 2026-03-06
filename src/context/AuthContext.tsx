import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

interface AuthContextValue {
  token: string | null
  login: (t: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  const login = (t: string) => setToken(t)
  const logout = useCallback(() => setToken(null), [])

  // Auto-logout por inatividade (30 minutos)
  useEffect(() => {
    if (!token) return

    let timeoutId: number | undefined

    const resetTimer = () => {
      clearTimeout(timeoutId)
      // 30 minutos em milissegundos
      timeoutId = window.setTimeout(() => {
        logout()
      }, 30 * 60 * 1000)
    }

    // Inicia o timer
    resetTimer()

    // Eventos de atividade do usuário
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart']
    const handleActivity = () => resetTimer()

    events.forEach(e => window.addEventListener(e, handleActivity))

    return () => {
      clearTimeout(timeoutId)
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, [token, logout])

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }