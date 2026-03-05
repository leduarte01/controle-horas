import { useAppContext } from '../../../context/AppContext'
import { monthlyTotals } from '../../../utils/employee'
import { fmtHours, fmtCurrency } from '../../../utils/format'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function TotalsBanner({ empId, year, month }: { empId: string; year: number; month: number }) {
  const { state } = useAppContext()
  const emp = state.employees.find(e => e.id === empId)
  if (!emp) return null
  const t = monthlyTotals(emp, year, month, state.entries, state.collectiveVacations, state.individualVacations)
  return (
    <div className="totals-banner">
      <div className="total-pill"><div className="tp-label">Dias Agendados</div><div className="tp-value">{t.scheduledDays}</div></div>
      <div className="total-pill green"><div className="tp-label">Dias Trabalhados</div><div className="tp-value">{t.daysWorked}</div></div>
      {t.vacationDays > 0 && <div className="total-pill" style={{ borderColor: '#0d9488' }}><div className="tp-label">Dias de Férias</div><div className="tp-value" style={{ color: '#0d9488' }}>{t.vacationDays}</div></div>}
      {t.holidayDays > 0 && <div className="total-pill" style={{ borderColor: '#d97706' }}><div className="tp-label">Feriados</div><div className="tp-value" style={{ color: '#d97706' }}>{t.holidayDays}</div></div>}
      <div className="total-pill"><div className="tp-label">Total de Horas</div><div className="tp-value">{fmtHours(t.totalH)}</div></div>
      <div className="total-pill amber"><div className="tp-label">Valor Total</div><div className="tp-value">{fmtCurrency(t.totalValue)}</div></div>
      {emp.vtValue > 0 && <div className="total-pill" style={{ borderColor: '#7c3aed' }}><div className="tp-label">Condução</div><div className="tp-value" style={{ color: '#7c3aed' }}>{fmtCurrency(t.conductionTotal)}</div></div>}
    </div>
  )
}

export function PT_MONTHS_EXPORT() { return PT_MONTHS }
