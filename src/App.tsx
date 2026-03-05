import { useState } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import { ModalProvider } from './context/ModalContext'
import { ToastProvider } from './context/ToastContext'
import { Sidebar } from './components/layout/Sidebar'
import { MobileHeader } from './components/layout/MobileHeader'
import { Modal } from './components/ui/Modal/Modal'
import { ToastContainer } from './components/ui/Toast/ToastContainer'
import { Dashboard } from './components/views/Dashboard/Dashboard'
import { Employees } from './components/views/Employees/Employees'
import { Hours } from './components/views/Hours/Hours'
import { Reports } from './components/views/Reports/Reports'
import { Vacations } from './components/views/Vacations/Vacations'

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '.9rem', fontWeight: 500 }}>Carregando dados...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function AppShell() {
  const { state, dispatch, isLoading } = useAppContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) return <LoadingScreen />

  return (
    <div className="app">
      <Sidebar currentView={state.view} onNavigate={v => { dispatch({ type: 'NAVIGATE', payload: v }); setSidebarOpen(false) }} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} onClick={() => setSidebarOpen(false)} />}
      <MobileHeader onHamburger={() => setSidebarOpen(true)} />
      <main className="main-content">
        {state.view === 'dashboard' && <Dashboard />}
        {state.view === 'employees' && <Employees />}
        {state.view === 'hours' && <Hours />}
        {state.view === 'reports' && <Reports />}
        {state.view === 'vacations' && <Vacations />}
      </main>
      <Modal />
      <ToastContainer />
    </div>
  )
}

export function App() {
  return (
    <AppProvider><ModalProvider><ToastProvider><AppShell /></ToastProvider></ModalProvider></AppProvider>
  )
}
