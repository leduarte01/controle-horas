export function fmtCurrency(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function fmtHours(h: number): string {
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h ${mm.toString().padStart(2, '0')}m`
}

export function fmtHoursDecimal(h: number): string {
  if (h === 0) return '0,00'
  return h.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'h'
}

export function fmtDateBR(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export function vacPeriodLabel(start: string, end: string): string {
  return `${fmtDateBR(start)} → ${fmtDateBR(end)}`
}
export function vacDayCount(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}
export function initials(name: string): string {
  return (name || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
