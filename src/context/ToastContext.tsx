import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { ToastItem, ToastType } from '../types'
import { uid } from '../utils/uid'

interface ToastContextValue { toasts: ToastItem[]; toast: (message: string, type?: ToastType) => void }
const ToastContext = createContext<ToastContextValue>(null!)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = uid()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800)
  }, [])
  return <ToastContext.Provider value={{ toasts, toast }}>{children}</ToastContext.Provider>
}

export function useToast() { return useContext(ToastContext) }
