import type { Loan, Payment, Person } from './types'
import { diffDays, monthKey, todayStr } from './dates'
import { toCents } from './money'

export type Status = 'quitado' | 'atrasado' | 'hoje' | 'proximo' | 'emdia'
export const PROXIMO_DIAS = 7

export interface LoanView {
  loan: Loan
  personName: string
  payments: Payment[]
  capitalC: number
  interestC: number
  totalC: number
  paidC: number
  balanceC: number
  // Regra: os pagamentos recuperam primeiro o CAPITAL; só depois o excedente é JURO (lucro).
  capitalRecC: number
  capitalOpenC: number
  interestRecC: number
  interestOpenC: number
  status: Status
  partial: boolean
  daysToDue: number
}

export function buildViews(loans: Loan[], people: Person[], payments: Payment[]): LoanView[] {
  const names = new Map(people.map((p) => [p.id, p.name]))
  const byLoan = new Map<string, Payment[]>()
  for (const p of payments) {
    const arr = byLoan.get(p.loan_id) ?? []
    arr.push(p)
    byLoan.set(p.loan_id, arr)
  }
  const today = todayStr()
  return loans.map((loan) => {
    const pays = (byLoan.get(loan.id) ?? []).slice().sort((a, b) => b.paid_at.localeCompare(a.paid_at))
    const capitalC = toCents(loan.principal)
    const interestC = toCents(loan.interest_amount)
    const totalC = toCents(loan.total_amount)
    const paidC = pays.reduce((s, p) => s + toCents(p.amount), 0)
    const balanceC = Math.max(totalC - paidC, 0)
    const capitalRecC = Math.min(paidC, capitalC)
    const interestRecC = Math.min(Math.max(paidC - capitalC, 0), interestC)
    const daysToDue = diffDays(today, loan.due_date)
    let status: Status
    if (balanceC <= 0) status = 'quitado'
    else if (daysToDue < 0) status = 'atrasado'
    else if (daysToDue === 0) status = 'hoje'
    else if (daysToDue <= PROXIMO_DIAS) status = 'proximo'
    else status = 'emdia'
    return {
      loan,
      personName: names.get(loan.person_id) ?? 'Pessoa removida',
      payments: pays,
      capitalC,
      interestC,
      totalC,
      paidC,
      balanceC,
      capitalRecC,
      capitalOpenC: capitalC - capitalRecC,
      interestRecC,
      interestOpenC: interestC - interestRecC,
      status,
      partial: paidC > 0 && balanceC > 0,
      daysToDue,
    }
  })
}

export interface Totals {
  lentC: number
  capitalOpenC: number
  profitForecastC: number
  profitRealizedC: number
  receivedC: number
  interestTotalC: number
  balanceC: number
  active: number
  closed: number
  late: number
}

export function totals(views: LoanView[]): Totals {
  const t: Totals = {
    lentC: 0, capitalOpenC: 0, profitForecastC: 0, profitRealizedC: 0,
    receivedC: 0, interestTotalC: 0, balanceC: 0, active: 0, closed: 0, late: 0,
  }
  for (const v of views) {
    t.lentC += v.capitalC
    t.capitalOpenC += v.capitalOpenC
    t.profitForecastC += v.interestOpenC
    t.profitRealizedC += v.interestRecC
    t.receivedC += v.paidC
    t.interestTotalC += v.interestC
    t.balanceC += v.balanceC
    if (v.status === 'quitado') t.closed++
    else t.active++
    if (v.status === 'atrasado') t.late++
  }
  return t
}

export interface MonthRow { key: string; lentC: number; receivedC: number }

export function monthly(views: LoanView[], keys?: string[]): MonthRow[] {
  const map = new Map<string, MonthRow>()
  const row = (k: string): MonthRow => {
    let r = map.get(k)
    if (!r) { r = { key: k, lentC: 0, receivedC: 0 }; map.set(k, r) }
    return r
  }
  for (const v of views) {
    row(monthKey(v.loan.loan_date)).lentC += v.capitalC
    for (const p of v.payments) row(monthKey(p.paid_at)).receivedC += toCents(p.amount)
  }
  if (keys) return keys.map((k) => map.get(k) ?? { key: k, lentC: 0, receivedC: 0 })
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
}

export const STATUS_LABEL: Record<Status, string> = {
  quitado: 'Quitado',
  atrasado: 'Atrasado',
  hoje: 'Vence hoje',
  proximo: 'Próximo',
  emdia: 'Em dia',
}
