import { useAppContext } from '../../../context/AppContext'
import { TotalsBanner } from './TotalsBanner'
import { SaturdayPanel } from './SaturdayPanel'
import { HoursTable } from './HoursTable/HoursTable'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function Hours() {
  const { state, dispatch } = useAppContext()
  const yearNow = new Date().getFullYear()
  const years = [yearNow - 1, yearNow, yearNow + 1]
  const emp = state.employees.find(e => e.id === state.selEmpId)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Controle de Horas</div>
          <div className="page-subtitle">Visualize e edite os horários por dia</div>
        </div>
      </div>
      <div className="hours-toolbar">
        <div className="form-group">
          <label className="form-label">Funcionário</label>
          <select className="form-control" value={state.selEmpId || ''} onChange={e => dispatch({ type: 'SET_SEL_EMP', payload: e.target.value || null })}>
            <option value="">— Selecione —</option>
            {state.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Mês</label>
          <select className="form-control" value={state.selMonth} onChange={e => dispatch({ type: 'SET_SEL_MONTH', payload: parseInt(e.target.value) })}>
            {PT_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Ano</label>
          <select className="form-control" value={state.selYear} onChange={e => dispatch({ type: 'SET_SEL_YEAR', payload: parseInt(e.target.value) })}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!state.selEmpId || !emp ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h3>Selecione um funcionário</h3>
          <p>Escolha o funcionário e o mês para ver o controle de horas.</p>
        </div>
      ) : (
        <>
          <TotalsBanner empId={state.selEmpId} year={state.selYear} month={state.selMonth} />
          <SaturdayPanel empId={state.selEmpId} year={state.selYear} month={state.selMonth} />
          <HoursTable empId={state.selEmpId} year={state.selYear} month={state.selMonth} />
        </>
      )}
    </div>
  )
}
