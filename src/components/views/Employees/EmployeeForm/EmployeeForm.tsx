import { useState } from 'react'
import { useAppContext } from '../../../../context/AppContext'
import { useModal } from '../../../../context/ModalContext'
import { useToast } from '../../../../context/ToastContext'
import { uid } from '../../../../utils/uid'
import type { Employee, DaySchedule } from '../../../../types'
import s from './EmployeeForm.module.css'

const DOW_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

interface Props { empId?: string; onClose: () => void }

export function EmployeeForm({ empId }: Props) {
  const { state, dispatch } = useAppContext()
  const { close } = useModal()
  const { toast } = useToast()

  const existing = empId ? state.employees.find(e => e.id === empId) : null

  const [name, setName] = useState(existing?.name || '')
  const [scheduleType, setScheduleType] = useState<'fixed'|'variable'>(existing?.scheduleType || 'fixed')
  const [entry, setEntry] = useState(existing?.entry || '08:00')
  const [exit, setExit] = useState(existing?.exit || '17:00')
  const [lunch, setLunch] = useState(String(existing?.lunch || ''))
  const [weekSchedule, setWeekSchedule] = useState<Record<number, DaySchedule>>(() => {
    if (existing?.weekSchedule) return existing.weekSchedule as Record<number, DaySchedule>
    const ws: Record<number, DaySchedule> = {}
    for (let d = 1; d <= 5; d++) ws[d] = { entry: '08:00', exit: '17:00', lunch: 0 }
    return ws
  })
  const [paymentType, setPaymentType] = useState<'hourly'|'monthly'>(existing?.paymentType || 'hourly')
  const [rate, setRate] = useState(existing?.paymentType !== 'monthly' ? String(existing?.rate || '') : '')
  const [monthlySalary, setMonthlySalary] = useState(existing?.paymentType === 'monthly' ? String(existing?.monthlySalary || '') : '')
  const [vtValue, setVtValue] = useState(String(existing?.vtValue || ''))
  const [satEntry, setSatEntry] = useState(existing?.satEntry || '08:00')
  const [satExit, setSatExit] = useState(existing?.satExit || '12:00')

  const updateWs = (dow: number, field: keyof DaySchedule, val: string) => {
    setWeekSchedule(prev => ({ ...prev, [dow]: { ...prev[dow], [field]: field === 'lunch' ? Number(val) || 0 : val } }))
  }

  const handleSubmit = () => {
    const trimName = name.trim()
    if (!trimName) { toast('Informe o nome do funcionário.', 'error'); return }
    const rateNum = parseFloat(rate)
    const salaryNum = parseFloat(monthlySalary)
    if (paymentType === 'hourly' && (!rateNum || rateNum <= 0)) { toast('Informe o valor por hora.', 'error'); return }
    if (paymentType === 'monthly' && (!salaryNum || salaryNum <= 0)) { toast('Informe o valor mensal.', 'error'); return }

    const empData: Omit<Employee, 'id'> = {
      name: trimName,
      scheduleType,
      entry: scheduleType === 'fixed' ? entry : '',
      exit: scheduleType === 'fixed' ? exit : '',
      lunch: scheduleType === 'fixed' ? (parseInt(lunch) || 0) : 0,
      weekSchedule: scheduleType === 'variable' ? (weekSchedule as Employee['weekSchedule']) : null,
      paymentType,
      rate: paymentType === 'hourly' ? rateNum : 0,
      monthlySalary: paymentType === 'monthly' ? salaryNum : 0,
      vtValue: parseFloat(vtValue) || 0,
      satEntry,
      satExit,
    }

    if (existing) {
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: existing.id, ...empData } })
      toast('Funcionário atualizado!')
    } else {
      dispatch({ type: 'ADD_EMPLOYEE', payload: { id: uid(), ...empData } })
      toast('Funcionário cadastrado!')
    }
    close()
  }

  return (
    <div>
      <div className="form-grid cols-1" style={{ marginBottom: 18 }}>
        <div className="form-group">
          <label className="form-label">Nome <span className="required">*</span></label>
          <input className="form-control" type="text" placeholder="Ex: João Silva" value={name} onChange={e => setName(e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 6 }}>
        <label className="form-label">Tipo de Horário</label>
      </div>
      <div className={`${s.schedTypeToggle} sched-type-toggle`} style={{ marginBottom: 16 }}>
        <label className={`${s.schedTypeOpt} sched-type-opt ${scheduleType === 'fixed' ? s.active : ''}`} onClick={() => setScheduleType('fixed')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Horário Fixo
        </label>
        <label className={`${s.schedTypeOpt} sched-type-opt ${scheduleType === 'variable' ? s.active : ''}`} onClick={() => setScheduleType('variable')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Horário Variável
        </label>
      </div>

      {scheduleType === 'fixed' && (
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Entrada</label>
            <input className="form-control" type="time" value={entry} onChange={e => setEntry(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Saída</label>
            <input className="form-control" type="time" value={exit} onChange={e => setExit(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Almoço (min)</label>
            <input className="form-control" type="number" min="0" max="180" placeholder="60" value={lunch} onChange={e => setLunch(e.target.value)} />
          </div>
        </div>
      )}

      {scheduleType === 'variable' && (
        <div style={{ marginBottom: 16 }}>
          <div className="form-hint" style={{ marginBottom: 10 }}>Configure a entrada, saída e almoço para cada dia da semana.</div>
          <div className={s.weekScheduleTable}>
            {[1,2,3,4,5].map(dow => (
              <div key={dow} className={s.weekDayRow}>
                <span className={s.weekDayLabel}>{DOW_LABELS[dow-1]}</span>
                <div className={s.weekDayFields}>
                  <div className={s.weekFieldGroup}>
                    <span className={s.weekFieldLabel}>Entrada</span>
                    <input className="form-control" type="time" value={weekSchedule[dow]?.entry || '08:00'} onChange={e => updateWs(dow, 'entry', e.target.value)} />
                  </div>
                  <div className={s.weekFieldGroup}>
                    <span className={s.weekFieldLabel}>Saída</span>
                    <input className="form-control" type="time" value={weekSchedule[dow]?.exit || '17:00'} onChange={e => updateWs(dow, 'exit', e.target.value)} />
                  </div>
                  <div className={s.weekFieldGroup}>
                    <span className={s.weekFieldLabel}>Almoço (min)</span>
                    <input className="form-control" type="number" min="0" max="180" placeholder="0" value={weekSchedule[dow]?.lunch || ''} onChange={e => updateWs(dow, 'lunch', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 6 }}>
        <label className="form-label">Tipo de Remuneração</label>
      </div>
      <div className={`${s.schedTypeToggle} sched-type-toggle`} style={{ marginBottom: 16 }}>
        <label className={`${s.schedTypeOpt} sched-type-opt ${paymentType === 'hourly' ? s.active : ''}`} onClick={() => setPaymentType('hourly')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Por Hora
        </label>
        <label className={`${s.schedTypeOpt} sched-type-opt ${paymentType === 'monthly' ? s.active : ''}`} onClick={() => setPaymentType('monthly')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          Mensal
        </label>
      </div>

      {paymentType === 'hourly' && (
        <div className="form-grid cols-1" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Valor por Hora (R$) <span className="required">*</span></label>
            <input className="form-control" type="number" step="0.01" min="0" placeholder="0,00" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
        </div>
      )}
      {paymentType === 'monthly' && (
        <div className="form-grid cols-1" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Valor Mensal (R$) <span className="required">*</span></label>
            <input className="form-control" type="number" step="0.01" min="0" placeholder="0,00" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} />
          </div>
        </div>
      )}

      <hr className="section-divider" />
      <div className="form-grid cols-1" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Vale Transporte / Condução (R$/dia)</label>
          <div className="form-hint">Valor diário de condução. Deixe em branco ou zero se não aplicável.</div>
          <input className="form-control" type="number" step="0.01" min="0" placeholder="0,00" value={vtValue} onChange={e => setVtValue(e.target.value)} />
        </div>
      </div>

      <hr className="section-divider" />
      <div className="form-group" style={{ marginBottom: 10 }}>
        <label className="form-label">Horário Padrão de Sábado</label>
        <div className="form-hint">Usado como padrão ao marcar sábados no Controle de Horas.</div>
      </div>
      <div className="form-grid" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Entrada (Sábado)</label>
          <input className="form-control" type="time" value={satEntry} onChange={e => setSatEntry(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Saída (Sábado)</label>
          <input className="form-control" type="time" value={satExit} onChange={e => setSatExit(e.target.value)} />
        </div>
      </div>

      <div className="modal-footer" style={{ padding: 0, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={close}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          {existing ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
        </button>
      </div>
    </div>
  )
}
