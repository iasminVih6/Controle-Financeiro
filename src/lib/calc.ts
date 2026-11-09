import type { Installment, Loan, Payment, Person } from './types'
import { diffDays, monthKey, todayStr } from './dates'
import { toCents } from './money'

export type Status = 'quitado' | 'atrasado' | 'hoje' | 'proximo' | 'emdia'
export const PROXIMO_DIAS = 7

export type InstStatus = 'paga' | 'parcial' | 'aberta' | 'atrasada'
export interface InstView { inst: Installment; amountC: number; coveredC: number; status: InstStatus }

export interface LoanView {
  loan: Loan
  insts: InstView[]
  parcelLabel: string | null
  dueDate: string // vencimento "efetivo": próxima parcela em aberto (ou o vencimento do empréstimo)
  normalPaidC: number
  interestPaidC: number
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

export function buildViews(loans: Loan[], people: Person[], payments: Payment[], installments: Installment[] = []): LoanView[] {
  const names = new Map(people.map((p) => [p.id, p.name]))
  const byLoan = new Map<string, Payment[]>()
  for (const p of payments) {
    const arr = byLoan.get(p.loan_id) ?? []
    arr.push(p)
    byLoan.set(p.loan_id, arr)
  }
  const instBy = new Map<string, Installment[]>()
  for (const i of installments) {
    const arr = instBy.get(i.loan_id) ?? []
    arr.push(i)
    instBy.set(i.loan_id, arr)
  }
  const today = todayStr()
  return loans.map((loan) => {
    const pays = (byLoan.get(loan.id) ?? []).slice().sort((a, b) => b.paid_at.localeCompare(a.paid_at))
    const capitalC = toCents(loan.principal)
    const interestC = toCents(loan.interest_amount)
    const totalC = toCents(loan.total_amount)
    // Pagamento "normal" abate o saldo; pagamento de "juros" não abate (o empréstimo é renovado).
    const normalPaidC = pays.filter((p) => p.kind !== 'juros').reduce((s, p) => s + toCents(p.amount), 0)
    const interestPaidC = pays.filter((p) => p.kind === 'juros').reduce((s, p) => s + toCents(p.amount), 0)
    const paidC = normalPaidC + interestPaidC
    const balanceC = Math.max(totalC - normalPaidC, 0)
    const capitalRecC = Math.min(normalPaidC, capitalC)
    // Regra: os pagamentos normais recuperam primeiro o CAPITAL; o que passar é juro.
    const interestFromNormalC = Math.min(Math.max(normalPaidC - capitalC, 0), interestC)
    const interestRecC = interestFromNormalC + interestPaidC
    // Parcelas: os pagamentos normais quitam da parcela mais antiga para a mais nova.
    let remaining = normalPaidC
    const insts: InstView[] = (instBy.get(loan.id) ?? [])
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((inst) => {
        const amountC = toCents(inst.amount)
        const coveredC = Math.min(Math.max(remaining, 0), amountC)
        remaining -= coveredC
        let st: InstStatus = coveredC >= amountC ? 'paga' : coveredC > 0 ? 'parcial' : 'aberta'
        if (st !== 'paga' && inst.due_date < today) st = 'atrasada'
        return { inst, amountC, coveredC, status: st }
      })
    const nextOpen = insts.find((i) => i.status !== 'paga')
    const dueDate = nextOpen ? nextOpen.inst.due_date : loan.due_date
    const parcelLabel = nextOpen ? `Parcela ${nextOpen.inst.number}/${insts.length}` : null
    const daysToDue = diffDays(today, dueDate)
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
      interestOpenC: interestC - interestFromNormalC,
      status,
      partial: normalPaidC > 0 && balanceC > 0,
      daysToDue,
      insts,
      parcelLabel,
      dueDate,
      normalPaidC,
      interestPaidC,
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
