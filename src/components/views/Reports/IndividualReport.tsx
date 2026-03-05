import { useAppContext } from '../../../context/AppContext'
import { getWorkDays, monthlyTotals, getEntry } from '../../../utils/employee'
import { calcDayTotal } from '../../../utils/time'
import { fmtHours, fmtCurrency } from '../../../utils/format'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const PT_DAYS_LONG = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

export function IndividualReport({ empId, year, month }: { empId: string; year: number; month: number }) {
  const { state } = useAppContext()
  const emp = state.employees.find(e => e.id === empId)
  if (!emp) return null

  const days = getWorkDays(emp, year, month, state.entries, state.collectiveVacations, state.individualVacations)
  const totals = monthlyTotals(emp, year, month, state.entries, state.collectiveVacations, state.individualVacations)

  return (
    <div id="print-area">
      <div className="report-meta">
        <span className="badge badge-blue">Funcionário: {emp.name}</span>
        <span className="badge badge-gray">Período: {PT_MONTHS[month]} / {year}</span>
        <span className="badge badge-gray">{emp.paymentType === 'monthly' ? `Salário Mensal: ${fmtCurrency(emp.monthlySalary)}` : `Valor/hora: ${fmtCurrency(emp.rate)}`}</span>
        {emp.vtValue > 0 && <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>Condução: {fmtCurrency(emp.vtValue)}/dia</span>}
      </div>

      <div className="report-section-title">Detalhamento de Horas</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Dia</th><th>Entrada</th><th>Saída</th><th>Almoço</th><th>Horas</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {days.map(d => {
                const ov = getEntry(state.entries, emp.id, d.dateStr)
                const absent = ov?.absent
                const locked = !!(absent || d.holiday || d.vacation)
                const entryVal = ov?.entry || d.defEntry
                const exitVal = ov?.exit || d.defExit
                const lunchVal = ov?.lunch !== undefined ? ov.lunch : d.defLunch
                const hours = locked ? 0 : calcDayTotal(d.defEntry, d.defExit, d.defLunch, ov)
                const value = locked ? 0 : (emp.paymentType === 'monthly'
                  ? (totals.scheduledDays > 0 ? (emp.monthlySalary || 0) / totals.scheduledDays : 0)
                  : hours * (emp.rate || 0))
                const rowStyle = d.holiday ? { background: '#fefce8' } : d.vacation ? { background: '#f0fdfa' } : undefined
                const statusCell = d.holiday
                  ? <><span style={{ color: '#d97706', fontWeight: 600 }}>Feriado</span><div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{d.holiday}</div></>
                  : d.vacation ? <span style={{ color: '#0d9488', fontWeight: 600 }}>Férias</span>
                  : absent ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Ausente</span>
                  : fmtHours(hours)
                return (
                  <tr key={d.dateStr} style={rowStyle}>
                    <td>{d.date.getDate().toString().padStart(2,'0')}/{(d.date.getMonth()+1).toString().padStart(2,'0')}/{d.date.getFullYear()}</td>
                    <td>{PT_DAYS_LONG[d.date.getDay()]}</td>
                    <td>{locked ? '—' : entryVal}</td>
                    <td>{locked ? '—' : exitVal}</td>
                    <td>{locked ? '—' : (lunchVal ? lunchVal+'min' : '—')}</td>
                    <td style={{ fontWeight: 600 }}>{statusCell}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{locked ? '—' : fmtCurrency(value)}</td>
                  </tr>
                )
              })}
              <tr className="row-total">
                <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL DO MÊS</td>
                <td>{fmtHours(totals.totalH)}</td>
                <td>{fmtCurrency(totals.totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-section-title">Resumo</div>
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card blue">
          <div className="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="stat-info"><div className="stat-label">Dias Agendados</div><div className="stat-value">{totals.scheduledDays}</div></div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
          <div className="stat-info"><div className="stat-label">Dias Trabalhados</div><div className="stat-value">{totals.daysWorked}</div></div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div className="stat-info"><div className="stat-label">Total de Horas</div><div className="stat-value">{fmtHours(totals.totalH)}</div></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div className="stat-info"><div className="stat-label">Valor a Pagar</div><div className="stat-value">{fmtCurrency(totals.totalValue)}</div></div>
        </div>
        {emp.vtValue > 0 && (
          <div className="stat-card" style={{ borderLeft: '3px solid #7c3aed' }}>
            <div className="stat-icon" style={{ background: '#ede9fe' }}><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 4v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
            <div className="stat-info"><div className="stat-label">Vale Transporte</div><div className="stat-value" style={{ color: '#7c3aed' }}>{fmtCurrency(totals.conductionTotal)}</div></div>
          </div>
        )}
      </div>
    </div>
  )
}
