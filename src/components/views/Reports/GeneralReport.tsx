import { useAppContext } from '../../../context/AppContext'
import { monthlyTotals } from '../../../utils/employee'
import { fmtHours, fmtCurrency } from '../../../utils/format'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function GeneralReport({ year, month }: { year: number; month: number }) {
  const { state } = useAppContext()

  if (state.employees.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>Nenhum funcionário cadastrado</h3>
      </div>
    )
  }

  let grandH = 0, grandVal = 0, grandCond = 0
  const rows = state.employees.map(e => {
    const t = monthlyTotals(e, year, month, state.entries, state.collectiveVacations, state.individualVacations)
    grandH += t.totalH
    grandVal += t.totalValue
    grandCond += t.conductionTotal
    return { e, t }
  })

  return (
    <div id="print-area">
      <div className="report-meta">
        <span className="badge badge-blue">Relatório Geral</span>
        <span className="badge badge-gray">Período: {PT_MONTHS[month]} / {year}</span>
        <span className="badge badge-gray">{state.employees.length} funcionário(s)</span>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th style={{ textAlign: 'center' }}>Dias Trab.</th>
                <th style={{ textAlign: 'center' }}>Horas</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>Condução</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, t }) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{e.paymentType === 'monthly' ? 'Mensal' : `${fmtCurrency(e.rate)}/h`}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{t.daysWorked}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{fmtHours(t.totalH)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{fmtCurrency(t.totalValue)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>{e.vtValue > 0 ? fmtCurrency(t.conductionTotal) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCurrency(t.totalValue + t.conductionTotal)}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td colSpan={2} style={{ textAlign: 'right' }}>TOTAL GERAL</td>
                <td style={{ textAlign: 'center' }}>{fmtHours(grandH)}</td>
                <td style={{ textAlign: 'right' }}>{fmtCurrency(grandVal)}</td>
                <td style={{ textAlign: 'right' }}>{fmtCurrency(grandCond)}</td>
                <td style={{ textAlign: 'right' }}>{fmtCurrency(grandVal + grandCond)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
