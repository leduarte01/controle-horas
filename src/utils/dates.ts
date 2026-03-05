export function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
export function getSaturdaysInMonth(year: number, month: number): Date[] {
  const sats: Date[] = []
  const total = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= total; d++) {
    const dt = new Date(year, month, d)
    if (dt.getDay() === 6) sats.push(dt)
  }
  return sats
}
export function saturdayNumber(date: Date): number { return Math.ceil(date.getDate() / 7) }

export function calculateEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m2 = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m2 + 114) / 31)
  const day = ((h + l - 7 * m2 + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const _holidayCache: Record<number, Map<string, string>> = {}
export function getHolidays(year: number): Map<string, string> {
  if (_holidayCache[year]) return _holidayCache[year]
  const h = new Map<string, string>()
  const add = (month: number, day: number, name: string) => h.set(isoDate(new Date(year, month - 1, day)), name)
  add(1, 1, 'Ano Novo'); add(4, 21, 'Tiradentes'); add(5, 1, 'Dia do Trabalhador')
  add(9, 7, 'Independência do Brasil'); add(10, 12, 'N. Sra. Aparecida')
  add(11, 2, 'Finados'); add(11, 15, 'Proclamação da República')
  add(11, 20, 'Consciência Negra'); add(12, 25, 'Natal')
  const easter = calculateEaster(year)
  const addOffset = (days: number, name: string) => h.set(isoDate(new Date(easter.getTime() + days * 86400000)), name)
  addOffset(-48, 'Carnaval'); addOffset(-47, 'Carnaval')
  addOffset(-2, 'Sexta-feira Santa'); addOffset(60, 'Corpus Christi')
  add(1, 25, 'Aniversário de São Paulo'); add(7, 9, 'Revolução Constitucionalista')
  _holidayCache[year] = h
  return h
}
