import s from './Sidebar.module.css'
import type { ViewName } from '../../types'
import { useAuth } from '../../context/AuthContext'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

interface NavItem { view: ViewName; label: string; icon: React.ReactNode }

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { view: 'employees', label: 'Funcionários', icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { view: 'hours', label: 'Controle de Horas', icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { view: 'reports', label: 'Relatórios', icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { view: 'vacations', label: 'Férias', icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> },
]

interface Props { currentView: ViewName; onNavigate: (v: ViewName) => void; isOpen: boolean; onClose: () => void }

export function Sidebar({ currentView, onNavigate, isOpen }: Props) {
  const now = new Date()
  const { logout } = useAuth()

  return (
    <aside className={`${s.sidebar} ${isOpen ? s.open : ''}`}>
      <div className={s.brand}>
        <div className={s.brandLogo}>
          <svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2.5"/><line x1="20" y1="20" x2="20" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="20" y1="20" x2="28" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/><circle cx="20" cy="20" r="2" fill="white"/></svg>
        </div>
        <div className={s.brandText}>
          <span className={s.brandTitle}>Controle</span>
          <span className={s.brandSub}>de Horas</span>
        </div>
      </div>
      <nav className={s.nav}>
        {navItems.map(item => (
          <a key={item.view} className={`${s.navItem} ${currentView === item.view ? s.active : ''}`} onClick={() => onNavigate(item.view)}>
            {item.icon}<span>{item.label}</span>
          </a>
        ))}
        
        <div style={{ flex: 1 }} />
        
        <a className={s.navItem} onClick={logout} style={{ color: 'var(--danger)', marginTop: 'auto' }}>
          <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sair (Logoff)</span>
        </a>
      </nav>
      <div className={s.footer}>
        <div className={s.monthBadge}>{PT_MONTHS[now.getMonth()]} {now.getFullYear()}</div>
      </div>
    </aside>
  )
}
