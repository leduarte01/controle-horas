import { useAppContext } from '../../../context/AppContext'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { monthlyTotals } from '../../../utils/employee'
import { fmtHours, fmtCurrency, fmtHoursDecimal } from '../../../utils/format'
import * as XLSX from 'xlsx'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function GeneralReport({ year, month }: { year: number; month: number }) {
  const { state } = useAppContext()
  const { open } = useModal()
  const { toast } = useToast()

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

  const exportToExcel = () => {
    const dataInfo = rows.map(({ e, t }) => ({
      'Funcionário': e.name,
      'Tipo': e.paymentType === 'monthly' ? 'Mensal' : 'Horista',
      'Taxa/h': e.rate,
      'Dias Trab.': t.daysWorked,
      'Total de Horas (Convencional)': fmtHours(t.totalH),
      'Total de Horas (Decimal - Contabilidade)': fmtHoursDecimal(t.totalH).replace('h', ''),
      'Valor a Pagar': t.totalValue,
      'Vale Transporte (Extra)': t.conductionTotal,
      'Total Final': t.totalValue + t.conductionTotal
    }))

    // Add totals row
    dataInfo.push({
      'Funcionário': 'TOTAL',
      'Tipo': '',
      'Taxa/h': 0,
      'Dias Trab.': 0,
      'Total de Horas (Convencional)': fmtHours(grandH),
      'Total de Horas (Decimal - Contabilidade)': fmtHoursDecimal(grandH).replace('h', ''),
      'Valor a Pagar': grandVal,
      'Vale Transporte (Extra)': grandCond,
      'Total Final': grandVal + grandCond
    })

    const worksheet = XLSX.utils.json_to_sheet(dataInfo)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio')
    XLSX.writeFile(workbook, `Relatorio_Geral_${PT_MONTHS[month]}_${year}.xlsx`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast('Copiado para a área de transferência', 'success')
  }

  const handleCopyAll = () => {
    const allText = rows.map(({ e, t }) => `${e.name}\t${fmtHoursDecimal(t.totalH).replace('h', '')}`).join('\n')
    navigator.clipboard.writeText(allText)
    toast('Todos foram copiados!', 'success')
  }

  const openAccountingModal = () => {
    open('Horas para Contabilidade', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn btn-outline" onClick={handleCopyAll} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copiar Tudo
        </button>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th style={{ textAlign: 'center' }}>Horas (Decimal)</th>
                <th style={{ textAlign: 'center', width: '60px' }}>Copiar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, t }) => {
                const val = fmtHoursDecimal(t.totalH).replace('h', '')
                return (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{val}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleCopy(val)} 
                        title="Copiar valor"
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    ))
  }

  return (
    <div id="print-area">
      <div className="report-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="badge badge-blue">Relatório Geral</span>
          <span className="badge badge-gray">Período: {PT_MONTHS[month]} / {year}</span>
          <span className="badge badge-gray">{state.employees.length} funcionário(s)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={openAccountingModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Relatório p/ Contabilidade
          </button>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Exportar para Excel
          </button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th style={{ textAlign: 'center' }}>Dias Trab.</th>
                <th style={{ textAlign: 'center' }}>Horas (Total)</th>
                <th style={{ textAlign: 'center', color: 'var(--text-light)', borderLeft: '1px solid var(--border)' }}>Horas p/ Contabilidade</th>
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
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', fontSize: '0.9rem' }}>
                    {fmtHoursDecimal(t.totalH)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{fmtCurrency(t.totalValue)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>{e.vtValue > 0 ? fmtCurrency(t.conductionTotal) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCurrency(t.totalValue + t.conductionTotal)}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td colSpan={2} style={{ textAlign: 'right' }}>TOTAL GERAL</td>
                <td style={{ textAlign: 'center' }}>{fmtHours(grandH)}</td>
                <td style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', color: 'var(--text)' }}>{fmtHoursDecimal(grandH)}</td>
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
