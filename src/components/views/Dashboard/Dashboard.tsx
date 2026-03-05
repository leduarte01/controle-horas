import { useAppContext } from '../../../context/AppContext'
import { useModal } from '../../../context/ModalContext'
import { monthlyTotals, countWorkingDays } from '../../../utils/employee'
import { fmtHours, fmtCurrency, initials } from '../../../utils/format'
import { EmployeeForm } from '../Employees/EmployeeForm/EmployeeForm'
import s from './Dashboard.module.css'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function Dashboard() {
  const { state, dispatch } = useAppContext()
  const { open } = useModal()
  const now = new Date()
  const curM = now.getMonth(), curY = now.getFullYear()

  let totalH = 0, totalVal = 0
  state.employees.forEach(emp => {
    const t = monthlyTotals(emp, curY, curM, state.entries, state.collectiveVacations, state.individualVacations)
    totalH += t.totalH
    totalVal += t.totalValue
  })

  const openNewEmployee = () => open('Novo Funcionário', <EmployeeForm onClose={() => {}} />)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{PT_MONTHS[curM]} {curY} — visão geral</div>
        </div>
        <button className="btn btn-primary no-print" onClick={openNewEmployee}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Funcionário
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Funcionários</div>
            <div className="stat-value">{state.employees.length}</div>
            <div className="stat-sub">cadastrados</div>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total de Horas</div>
            <div className="stat-value">{fmtHours(totalH)}</div>
            <div className="stat-sub">no mês atual</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Valor Total</div>
            <div className="stat-value">{fmtCurrency(totalVal)}</div>
            <div className="stat-sub">a pagar no mês</div>
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Dias Úteis</div>
            <div className="stat-value">{countWorkingDays(curY, curM)}</div>
            <div className="stat-sub">no mês atual</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Funcionários — {PT_MONTHS[curM]} {curY}
          </span>
        </div>
        <div className="card-body" style={{ padding: '8px 12px' }}>
          {state.employees.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <h3>Nenhum funcionário cadastrado</h3>
              <p>Vá em Funcionários para adicionar o primeiro.</p>
            </div>
          ) : state.employees.map(emp => {
            const t = monthlyTotals(emp, curY, curM, state.entries, state.collectiveVacations, state.individualVacations)
            const schedLabel = emp.scheduleType === 'variable'
              ? `Horário variável · Sáb: ${emp.satEntry||'08:00'}–${emp.satExit||'12:00'} (escala mensal)`
              : `${emp.entry} – ${emp.exit} · Sáb: ${emp.satEntry||'08:00'}–${emp.satExit||'12:00'} (escala mensal)`
            return (
              <div key={emp.id} className={s.empRow} onClick={() => { dispatch({ type: 'SET_SEL_EMP', payload: emp.id }); dispatch({ type: 'NAVIGATE', payload: 'hours' }) }}>
                <div className="emp-avatar">{initials(emp.name)}</div>
                <div className={s.empRowInfo}>
                  <div className={s.empRowName}>{emp.name}</div>
                  <div className={s.empRowSched}>{schedLabel} · {emp.paymentType === 'monthly' ? 'Mensal' : `${fmtCurrency(emp.rate)}/h`}</div>
                </div>
                <div className={s.empRowStats}>
                  <div>
                    <div className={s.empRowStatVal} style={{ color: 'var(--primary)' }}>{fmtHours(t.totalH)}</div>
                    <div className={s.empRowStatLbl}>Horas mês</div>
                  </div>
                  <div>
                    <div className={s.empRowStatVal} style={{ color: 'var(--success)' }}>{fmtCurrency(t.totalValue)}</div>
                    <div className={s.empRowStatLbl}>Valor mês</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
