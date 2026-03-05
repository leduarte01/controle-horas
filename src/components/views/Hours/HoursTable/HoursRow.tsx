import { useState } from 'react'
import { useAppContext } from '../../../../context/AppContext'
import { useModal } from '../../../../context/ModalContext'
import { useToast } from '../../../../context/ToastContext'
import { getEntry } from '../../../../utils/employee'
import { calcHours, timeToMin } from '../../../../utils/time'
import { fmtHours } from '../../../../utils/format'
import { uid } from '../../../../utils/uid'
import type { WorkDay, Employee } from '../../../../types'

interface Props { day: WorkDay; emp: Employee; scheduledDays: number }

const PT_DAYS_LONG = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

export function ExtrasModal({ empId, dateStr, date }: { empId: string; dateStr: string; date: Date }) {
  const { state, dispatch } = useAppContext()
  const { close } = useModal()
  const { toast } = useToast()
  const [exEntry, setExEntry] = useState('')
  const [exExit, setExExit] = useState('')
  const [exNote, setExNote] = useState('')

  const ov = getEntry(state.entries, empId, dateStr) || {}
  const extras = ov.extras || []
  const totalExtra = extras.reduce((s, ex) => s + calcHours(ex.entry, ex.exit, 0), 0)

  const handleAdd = () => {
    if (!exEntry || !exExit) { toast('Informe entrada e saída do período.', 'error'); return }
    if (timeToMin(exExit) <= timeToMin(exEntry)) { toast('A saída deve ser posterior à entrada.', 'error'); return }
    const newExtras = [...extras, { id: uid(), entry: exEntry, exit: exExit, note: exNote.trim() }]
    dispatch({ type: 'SET_ENTRY', payload: { empId, dateStr, data: { ...ov, extras: newExtras } } })
    toast('Período adicional registrado!')
    setExEntry(''); setExExit(''); setExNote('')
  }

  const handleRemove = (idx: number) => {
    const newExtras = extras.filter((_, i) => i !== idx)
    dispatch({ type: 'SET_ENTRY', payload: { empId, dateStr, data: { ...ov, extras: newExtras } } })
  }

  const lbl = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')} — ${PT_DAYS_LONG[date.getDay()]}`

  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: '.875rem', color: 'var(--text-muted)' }}>{lbl}</div>
      {extras.length === 0 ? (
        <p className="extras-empty">Nenhum período adicional registrado para este dia.</p>
      ) : (
        extras.map((ex, i) => (
          <div key={ex.id} className="extra-item">
            <div className="extra-times">
              <span className="extra-time-val">{ex.entry}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <span className="extra-time-val">{ex.exit}</span>
              <span className="badge badge-extras">{fmtHours(calcHours(ex.entry, ex.exit, 0))}</span>
            </div>
            {ex.note && <div className="extra-note">{ex.note}</div>}
            <button className="btn-icon danger" title="Remover" onClick={() => handleRemove(i)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        ))
      )}
      {totalExtra > 0 && (
        <div className="extras-total-row">
          <span>Total de horas adicionais</span>
          <span className="extras-total-val">{fmtHours(totalExtra)}</span>
        </div>
      )}
      <hr className="section-divider" />
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)' }}>Adicionar período</div>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="form-label">Entrada</label>
          <input className="form-control" type="time" value={exEntry} onChange={e => setExEntry(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Saída</label>
          <input className="form-control" type="time" value={exExit} onChange={e => setExExit(e.target.value)} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Observação (opcional)</label>
        <input className="form-control" type="text" placeholder="Ex: Cobertura, Evento especial..." value={exNote} onChange={e => setExNote(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-secondary" onClick={close}>Fechar</button>
        <button className="btn btn-primary" onClick={handleAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Período
        </button>
      </div>
    </div>
  )
}

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function HoursRow({ day, emp, scheduledDays }: Props) {
  const { state, dispatch } = useAppContext()
  const { open } = useModal()

  const ov = getEntry(state.entries, emp.id, day.dateStr)
  const absent = ov?.absent
  const vacation = day.vacation
  const holiday = day.holiday
  const locked = !!(absent || vacation || holiday)

  const entryVal = ov?.entry || day.defEntry
  const exitVal = ov?.exit || day.defExit
  const lunchVal = ov?.lunch !== undefined ? ov.lunch : day.defLunch

  const mainHours = locked ? 0 : calcHours(entryVal, exitVal, Number(lunchVal))
  const extraHours = (!locked && ov?.extras?.length)
    ? ov.extras.reduce((s, ex) => s + calcHours(ex.entry, ex.exit, 0), 0) : 0
  const hours = mainHours + extraHours
  const value = emp.paymentType === 'monthly'
    ? (scheduledDays > 0 ? (emp.monthlySalary || 0) / scheduledDays : 0)
    : hours * (emp.rate || 0)

  const isToday = day.dateStr === new Date().toISOString().slice(0, 10)
  const timesChanged = !locked && ov && ((ov.entry && ov.entry !== day.defEntry) || (ov.exit && ov.exit !== day.defExit))
  const modified = !!timesChanged

  let rowClass = ''
  if (vacation) rowClass = 'row-vacation'
  else if (holiday) rowClass = 'row-holiday'
  else if (absent) rowClass = 'row-absent'
  else if (modified) rowClass = 'row-modified'
  else if (day.isSaturday) rowClass = 'row-saturday'

  const vacKindLabel = vacation ? (vacation.kind === 'collective' ? 'Coletiva' : 'Individual') : ''

  const handleFieldChange = (field: 'entry' | 'exit' | 'lunch', value: string) => {
    const current = getEntry(state.entries, emp.id, day.dateStr) || {}
    const updated = {
      entry: current.entry || day.defEntry,
      exit: current.exit || day.defExit,
      lunch: current.lunch !== undefined ? current.lunch : day.defLunch,
      ...current,
      [field]: field === 'lunch' ? (parseInt(value) || 0) : value,
    }
    dispatch({ type: 'SET_ENTRY', payload: { empId: emp.id, dateStr: day.dateStr, data: updated } })
  }

  const handleMarkAbsent = () => dispatch({ type: 'SET_ENTRY', payload: { empId: emp.id, dateStr: day.dateStr, data: { absent: true } } })
  const handleRestore = () => dispatch({ type: 'DELETE_ENTRY', payload: { empId: emp.id, dateStr: day.dateStr } })
  const handleRestoreSat = () => dispatch({ type: 'SET_ENTRY', payload: { empId: emp.id, dateStr: day.dateStr, data: { satWork: true, entry: emp.satEntry || '08:00', exit: emp.satExit || '12:00', lunch: 0 } } })

  const openExtras = () => open(`Horas Adicionais — ${day.date.getDate().toString().padStart(2,'0')}/${(day.date.getMonth()+1).toString().padStart(2,'0')}`, <ExtrasModal empId={emp.id} dateStr={day.dateStr} date={day.date} />)

  return (
    <tr className={rowClass} data-date={day.dateStr}>
      <td>
        <div style={{ fontWeight: 600, color: isToday ? 'var(--primary)' : undefined }}>{day.date.getDate().toString().padStart(2,'0')}/{(day.date.getMonth()+1).toString().padStart(2,'0')}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{PT_DAYS[day.date.getDay()]}</div>
      </td>
      <td>
        {vacation ? <span className="badge badge-vacation">Férias {vacKindLabel}</span>
          : holiday ? <span className="badge badge-holiday">Feriado</span>
          : absent ? <span className="badge badge-red">Ausente</span>
          : modified ? <span className="badge badge-amber">Alterado</span>
          : day.isSaturday ? <span className="badge badge-cyan">Sábado</span>
          : <span className="badge badge-gray">Normal</span>}
        {extraHours > 0 && <div style={{ marginTop: 3 }}><span className="badge-extras">+{fmtHours(extraHours)} extra</span></div>}
        {holiday && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{holiday}</div>}
      </td>
      <td>{locked ? '—' : <input className="time-input-inline" type="time" defaultValue={entryVal} key={`${day.dateStr}-entry-${entryVal}`} onBlur={e => handleFieldChange('entry', e.target.value)} />}</td>
      <td>{locked ? '—' : <input className="time-input-inline" type="time" defaultValue={exitVal} key={`${day.dateStr}-exit-${exitVal}`} onBlur={e => handleFieldChange('exit', e.target.value)} />}</td>
      <td>{locked ? '—' : <input className="time-input-inline" type="number" placeholder="0" min="0" max="180" defaultValue={String(lunchVal)} key={`${day.dateStr}-lunch-${lunchVal}`} onBlur={e => handleFieldChange('lunch', e.target.value)} style={{ width: 62 }} />}</td>
      <td style={{ fontWeight: 600 }}>{locked ? '—' : fmtHours(hours)}</td>
      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{locked ? '—' : fmtHours(hours) && `R$ ${(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</td>
      <td>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {(vacation || holiday) && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{vacation ? (vacation as { note?: string }).note || '' : ''}</span>}
          {!absent && !vacation && !holiday && (
            <button className={`btn-icon ${extraHours > 0 ? 'has-extras' : ''}`} title={extraHours > 0 ? `${ov?.extras?.length} período(s) adicional(is)` : 'Adicionar horas adicionais'} onClick={openExtras}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
          {!absent && !vacation && !holiday && (
            <button className="btn-icon danger" title="Marcar como ausente" onClick={handleMarkAbsent}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </button>
          )}
          {absent && !vacation && !holiday && (
            <button className="btn-icon" title="Restaurar dia" onClick={handleRestore}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </button>
          )}
          {!vacation && !holiday && (modified || (day.isSaturday && !absent)) && (
            <button className="btn-icon" title="Restaurar horário padrão" onClick={day.isSaturday ? handleRestoreSat : handleRestore}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
