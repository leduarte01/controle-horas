import { useAppContext } from '../../../../context/AppContext'
import { getWorkDays, monthlyTotals } from '../../../../utils/employee'
import { HoursRow } from './HoursRow'

interface Props { empId: string; year: number; month: number }

export function HoursTable({ empId, year, month }: Props) {
  const { state } = useAppContext()
  const emp = state.employees.find(e => e.id === empId)
  if (!emp) return null

  const days = getWorkDays(emp, year, month, state.entries, state.collectiveVacations, state.individualVacations)
  const totals = monthlyTotals(emp, year, month, state.entries, state.collectiveVacations, state.individualVacations)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Registro de Horas — {emp.name}</span>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th><th>Status</th><th>Entrada</th><th>Saída</th>
              <th>Almoço</th><th>Horas</th><th>Valor</th><th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {days.map(d => <HoursRow key={d.dateStr} day={d} emp={emp} scheduledDays={totals.scheduledDays} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
