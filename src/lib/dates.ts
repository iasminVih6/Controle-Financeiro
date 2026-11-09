const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const todayStr = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fmtDate = (s: string): string => {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
const utc = (s: string): number => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
// dias de a até b (b - a)
export const diffDays = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86400000)
export const monthKey = (s: string): string => s.slice(0, 7)
export const monthLabel = (k: string): string => {
  const [y, m] = k.split('-')
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`
}
export const lastMonths = (n: number): string[] => {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

// Soma n meses a uma data AAAA-MM-DD (dia 31 + 1 mês cai no último dia do mês seguinte).
export const addMonths = (s: string, n: number): string => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const t = m - 1 + n
  const yy = y + Math.floor(t / 12)
  const mm = ((t % 12) + 12) % 12
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate()
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}
