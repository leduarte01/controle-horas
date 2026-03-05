import { useAppContext } from '../../../../context/AppContext'
import { useModal } from '../../../../context/ModalContext'
import { useToast } from '../../../../context/ToastContext'
import { monthlyTotals } from '../../../../utils/employee'
import { fmtHours, fmtCurrency, initials } from '../../../../utils/format'
import { EmployeeForm } from '../EmployeeForm/EmployeeForm'
import type { Employee } from '../../../../types'
import s from './EmployeeCard.module.css'

const DOW_SHORT = ['Seg','Ter','Qua','Qui','Sex']

interface Props { emp: Employee }

export function EmployeeCard({ emp }: Props) {
  const { state, dispatch } = useAppContext()
  const { open } = useModal()
  const { toast } = useToast()
  const now = new Date()
  const t = monthlyTotals(emp, now.getFullYear(), now.getMonth(), state.entries, state.collectiveVacations, state.individualVacations)

  const handleDelete = () => {
    if (!confirm(`Excluir "${emp.name}"? Esta ação não pode ser desfeita.`)) return
    dispatch({ type: 'DELETE_EMPLOYEE', payload: emp.id })
    toast(`${emp.name} excluído.`, 'warning')
  }

  const valuePerDay = emp.paymentType === 'monthly'
    ? (t.scheduledDays > 0 ? (emp.monthlySalary || 0) / t.scheduledDays : 0)
    : (t.daysWorked > 0 ? t.totalValue / t.daysWorked : 0)

  return (
    <div className={s.card}>
      <div className={s.header}>
        <div className="emp-avatar">{initials(emp.name)}</div>
        <div>
          <div className={s.name}>{emp.name}</div>
          <div className={s.rate}>{emp.paymentType === 'monthly' ? `${fmtCurrency(emp.monthlySalary)}/mês` : `${fmtCurrency(emp.rate)}/hora`}</div>
        </div>
      </div>

      <div className={s.infoRow}>
        <div className={s.schedBlock}>
          <div className={s.schTitle}>Horário</div>
          {emp.scheduleType === 'variable' ? (
            <>
              <div className={s.schTime} style={{ fontSize: '.78rem' }}>Variável</div>
              <div className={s.weekMiniSched}>
                {[1,2,3,4,5].map(dow => {
                  const sch = emp.weekSchedule?.[dow as 1|2|3|4|5]
                  if (!sch) return null
                  return <span key={dow}><b>{DOW_SHORT[dow-1]}</b> {sch.entry}–{sch.exit}</span>
                })}
              </div>
            </>
          ) : (
            <>
              <div className={s.schTime}>{emp.entry} – {emp.exit}</div>
              {emp.lunch ? <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{emp.lunch}min almoço</div> : null}
            </>
          )}
        </div>
        <div className={s.schedBlock}>
          <div className={s.schTitle}>Sábados (padrão)</div>
          <div className={s.schTime} style={{ fontSize: '.8rem' }}>Por escala mensal</div>
          <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{emp.satEntry||'08:00'}–{emp.satExit||'12:00'}</div>
        </div>
      </div>

      <div className={s.stats}>
        <div className={s.stat}>
          <div className={s.statVal}>{fmtHours(t.totalH)}</div>
          <div className={s.statLbl}>Horas/mês</div>
        </div>
        <div className={s.stat}>
          <div className={s.statVal} style={{ color: 'var(--success)' }}>{fmtCurrency(t.totalValue)}</div>
          <div className={s.statLbl}>Valor/mês</div>
        </div>
        <div className={s.stat}>
          <div className={s.statVal} style={{ color: 'var(--warning)' }}>{fmtCurrency(valuePerDay)}</div>
          <div className={s.statLbl}>Valor/dia</div>
        </div>
        {emp.vtValue > 0 && (
          <div className={s.stat}>
            <div className={s.statVal} style={{ color: '#7c3aed' }}>{fmtCurrency(t.conductionTotal)}</div>
            <div className={s.statLbl}>Condução/mês</div>
          </div>
        )}
      </div>

      <div className={s.actions}>
        <button className="btn btn-ghost btn-sm" onClick={() => { dispatch({ type: 'SET_SEL_EMP', payload: emp.id }); dispatch({ type: 'NAVIGATE', payload: 'hours' }) }}>Ver horas</button>
        <button className="btn-icon" title="Editar" onClick={() => open('Editar Funcionário', <EmployeeForm empId={emp.id} onClose={() => {}} />)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="btn-icon danger" title="Excluir" onClick={handleDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>
  )
}
