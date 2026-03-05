import { useAppContext } from '../../../context/AppContext'
import { getSaturdaysInMonth, isoDate, saturdayNumber } from '../../../utils/dates'
import { getEntry } from '../../../utils/employee'

interface Props { empId: string; year: number; month: number }

export function SaturdayPanel({ empId, year, month }: Props) {
  const { state, dispatch } = useAppContext()
  const emp = state.employees.find(e => e.id === empId)
  const sats = getSaturdaysInMonth(year, month)

  if (!emp) return null

  const handleChange = (dateStr: string, checked: boolean) => {
    if (checked) {
      dispatch({ type: 'SET_ENTRY', payload: { empId, dateStr, data: { satWork: true, entry: emp.satEntry || '08:00', exit: emp.satExit || '12:00', lunch: 0 } } })
    } else {
      dispatch({ type: 'DELETE_ENTRY', payload: { empId, dateStr } })
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Escala de Sábados — {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][month]} {year}
        </span>
        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Marque os sábados que {emp.name} trabalha neste mês</span>
      </div>
      <div className="card-body">
        {sats.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Não há sábados neste mês.</span>
        ) : (
          <div className="sat-grid">
            {sats.map(sat => {
              const dateStr = isoDate(sat)
              const ov = getEntry(state.entries, empId, dateStr)
              const isWork = ov?.satWork === true
              const dayNum = sat.getDate().toString().padStart(2, '0')
              const monthNum = (sat.getMonth() + 1).toString().padStart(2, '0')
              const ordinal = saturdayNumber(sat)
              return (
                <label key={dateStr} className={`sat-label ${isWork ? 'checked' : ''}`}>
                  <input type="checkbox" checked={isWork} onChange={e => handleChange(dateStr, e.target.checked)} />
                  {dayNum}/{monthNum} &nbsp;<span style={{ fontSize: '.72rem', opacity: .75 }}>({ordinal}º)</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
