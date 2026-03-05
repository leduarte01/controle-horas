import { useAppContext } from '../../../context/AppContext'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { vacPeriodLabel, vacDayCount, fmtDateBR, initials } from '../../../utils/format'
import { VacationForm } from './VacationForm/VacationForm'

export function Vacations() {
  const { state, dispatch } = useAppContext()
  const { open } = useModal()
  const { toast } = useToast()

  const handleDeleteCollective = (id: string) => {
    const v = state.collectiveVacations.find(x => x.id === id)
    if (!v) return
    if (!confirm(`Excluir Férias Coletivas (${fmtDateBR(v.startDate)} → ${fmtDateBR(v.endDate)})?`)) return
    dispatch({ type: 'DELETE_COLLECTIVE_VAC', payload: id })
    toast('Período de férias removido.', 'warning')
  }

  const handleDeleteIndividual = (id: string) => {
    const v = state.individualVacations.find(x => x.id === id)
    if (!v) return
    if (!confirm(`Excluir Férias Individuais (${fmtDateBR(v.startDate)} → ${fmtDateBR(v.endDate)})?`)) return
    dispatch({ type: 'DELETE_INDIVIDUAL_VAC', payload: id })
    toast('Período de férias removido.', 'warning')
  }

  const editSvg = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  const deleteSvg = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Férias</div>
          <div className="page-subtitle">Cadastre períodos de férias coletivas e individuais</div>
        </div>
      </div>

      {/* Collective */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Férias Coletivas
          </span>
          <button className="btn btn-primary btn-sm no-print" onClick={() => open('Novo Período de Férias Coletivas', <VacationForm type="collective" />)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Período
          </button>
        </div>
        <div className="table-wrapper">
          <table className="vac-table">
            <thead><tr><th>Tipo</th><th>Período</th><th>Observação</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
            <tbody>
              {state.collectiveVacations.length === 0 ? (
                <tr><td colSpan={4} className="vac-empty">Nenhum período cadastrado.</td></tr>
              ) : state.collectiveVacations.map(v => (
                <tr key={v.id}>
                  <td><span className="badge badge-vacation-col">Coletiva</span></td>
                  <td>{vacPeriodLabel(v.startDate, v.endDate)}<div className="vac-duration">{vacDayCount(v.startDate, v.endDate)} dia(s) corridos</div></td>
                  <td>{v.note ? <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{v.note}</span> : '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-icon" title="Editar" onClick={() => open('Editar Férias Coletivas', <VacationForm type="collective" vacId={v.id} />)}>{editSvg}</button>
                    <button className="btn-icon danger" title="Excluir" onClick={() => handleDeleteCollective(v.id)}>{deleteSvg}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Férias Individuais
          </span>
          <button className="btn btn-primary btn-sm no-print" onClick={() => open('Novo Período de Férias Individuais', <VacationForm type="individual" />)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Período
          </button>
        </div>
        <div className="table-wrapper">
          <table className="vac-table">
            <thead><tr><th>Funcionário</th><th>Tipo</th><th>Período</th><th>Observação</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
            <tbody>
              {state.individualVacations.length === 0 ? (
                <tr><td colSpan={5} className="vac-empty">Nenhum período cadastrado.</td></tr>
              ) : state.individualVacations.map(v => {
                const emp = state.employees.find(e => e.id === v.empId)
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="emp-avatar" style={{ width: 30, height: 30, fontSize: '.75rem', borderRadius: 8, flexShrink: 0 }}>{initials(emp?.name || '?')}</span>
                        <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{emp?.name || 'Removido'}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-vacation">Individual</span></td>
                    <td>{vacPeriodLabel(v.startDate, v.endDate)}<div className="vac-duration">{vacDayCount(v.startDate, v.endDate)} dia(s) corridos</div></td>
                    <td>{v.note ? <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{v.note}</span> : '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" title="Editar" onClick={() => open('Editar Férias Individuais', <VacationForm type="individual" vacId={v.id} />)}>{editSvg}</button>
                      <button className="btn-icon danger" title="Excluir" onClick={() => handleDeleteIndividual(v.id)}>{deleteSvg}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
