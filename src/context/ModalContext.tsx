import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface ModalState { isOpen: boolean; title: string; content: ReactNode; large: boolean }
interface ModalContextValue { open: (title: string, content: ReactNode, opts?: { large?: boolean }) => void; close: () => void; state: ModalState }
const ModalContext = createContext<ModalContextValue>(null!)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ isOpen: false, title: '', content: null, large: false })
  const open = useCallback((title: string, content: ReactNode, opts?: { large?: boolean }) => setState({ isOpen: true, title, content, large: opts?.large ?? false }), [])
  const close = useCallback(() => setState(s => ({ ...s, isOpen: false })), [])
  return <ModalContext.Provider value={{ open, close, state }}>{children}</ModalContext.Provider>
}

export function useModal() { return useContext(ModalContext) }
