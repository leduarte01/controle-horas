import { useAppContext } from '../../../context/AppContext'
import { IndividualReport } from './IndividualReport'
import { GeneralReport } from './GeneralReport'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function Reports() {
  const { state, dispatch } = useAppContext()
  const yearNow = new Date().getFullYear()
  const years = [yearNow - 1, yearNow, yearNow + 1]
  const emp = state.employees.find(e => e.id === state.selEmpId)
  const isAll = state.selEmpId === 'all'
  const showPrint = emp || isAll

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios</div>
          <div className="page-subtitle">Gere e imprima relatórios mensais</div>
        </div>
        {showPrint && (
          <button className="btn btn-primary no-print" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
        )}
      </div>
      <div className="hours-toolbar no-print" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Funcionário</label>
          <select className="form-control" value={state.selEmpId || ''} onChange={e => dispatch({ type: 'SET_SEL_EMP', payload: e.target.value || null })}>
            <option value="">— Selecione —</option>
            <option value="all">Todos — Geral</option>
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

      {isAll ? (
        <GeneralReport year={state.selYear} month={state.selMonth} />
      ) : emp ? (
        <IndividualReport empId={emp.id} year={state.selYear} month={state.selMonth} />
      ) : (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h3>Selecione um funcionário</h3>
          <p>Escolha o funcionário e o período para gerar o relatório.</p>
        </div>
      )}
    </div>
  )
}
