import { useState } from 'react'
import { useAppContext } from '../../../../context/AppContext'
import { useModal } from '../../../../context/ModalContext'
import { useToast } from '../../../../context/ToastContext'
import { vacDayCount } from '../../../../utils/format'
import { uid } from '../../../../utils/uid'

interface Props { type: 'collective' | 'individual'; vacId?: string }

export function VacationForm({ type, vacId }: Props) {
  const { state, dispatch } = useAppContext()
  const { close } = useModal()
  const { toast } = useToast()

  const isCollective = type === 'collective'
  const list = isCollective ? state.collectiveVacations : state.individualVacations
  const existing = vacId ? list.find(v => v.id === vacId) : null

  const [empId, setEmpId] = useState((existing && !isCollective) ? (existing as { empId?: string }).empId || '' : '')
  const [startDate, setStartDate] = useState(existing?.startDate || '')
  const [endDate, setEndDate] = useState(existing?.endDate || '')
  const [note, setNote] = useState(existing?.note || '')

  const duration = startDate && endDate && endDate >= startDate ? vacDayCount(startDate, endDate) : null

  const handleSubmit = () => {
    if (!startDate || !endDate) { toast('Informe as datas de início e fim.', 'error'); return }
    if (endDate < startDate) { toast('A data fim deve ser igual ou posterior ao início.', 'error'); return }
    if (!isCollective && !empId) { toast('Selecione o funcionário.', 'error'); return }

    if (isCollective) {
      const data = { id: existing?.id || uid(), startDate, endDate, note }
      if (existing) { dispatch({ type: 'UPDATE_COLLECTIVE_VAC', payload: data }) }
      else { dispatch({ type: 'ADD_COLLECTIVE_VAC', payload: data }) }
    } else {
      const data = { id: existing?.id || uid(), empId, startDate, endDate, note }
      if (existing) { dispatch({ type: 'UPDATE_INDIVIDUAL_VAC', payload: data }) }
      else { dispatch({ type: 'ADD_INDIVIDUAL_VAC', payload: data }) }
    }
    toast(existing ? 'Período de férias atualizado!' : 'Período de férias cadastrado!')
    close()
  }

  return (
    <div>
      {!isCollective && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Funcionário <span className="required">*</span></label>
          <select className="form-control" value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">— Selecione —</option>
            {state.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Data Início <span className="required">*</span></label>
          <input className="form-control" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Data Fim <span className="required">*</span></label>
          <input className="form-control" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 4 }}>
        <label className="form-label">Observação (opcional)</label>
        <input className="form-control" type="text" placeholder="Ex: Recesso de fim de ano, Férias anuais..." value={note} onChange={e => setNote(e.target.value)} />
      </div>
      {duration !== null && (
        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
          Período: {duration} dia(s) corridos
        </div>
      )}
      <div className="modal-footer" style={{ padding: 0, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={close}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          {existing ? 'Salvar Alterações' : 'Cadastrar Período'}
        </button>
      </div>
    </div>
  )
}
