import type { LoanView } from './calc'
import { STATUS_LABEL } from './calc'
import { download, toCsv } from './csv'
import { fmtDate, todayStr } from './dates'
import { num2, toCents } from './money'
import type { Installment, Loan, Payment, Person } from './types'

export function exportLoans(views: LoanView[], name = 'emprestimos'): void {
  const rows: (string | number)[][] = [[
    'Pessoa', 'Data do empréstimo', 'Vencimento', 'Capital (R$)', 'Juros (%)', 'Juros (R$)', 'Total a receber (R$)',
    'Total recebido (R$)', 'Saldo (R$)', 'Capital recuperado (R$)', 'Juros recebidos (R$)', 'Situação', 'Observações',
  ]]
  for (const v of views)
    rows.push([
      v.personName, fmtDate(v.loan.loan_date), fmtDate(v.dueDate), num2(v.capitalC),
      String(v.loan.interest_rate).replace('.', ','), num2(v.interestC), num2(v.totalC), num2(v.paidC),
      num2(v.balanceC), num2(v.capitalRecC), num2(v.interestRecC), STATUS_LABEL[v.status], v.loan.notes ?? '',
    ])
  download(`${name}-${todayStr()}.csv`, toCsv(rows))
}

export function exportPayments(views: LoanView[], name = 'pagamentos'): void {
  const rows: (string | number)[][] = [['Pessoa', 'Data do pagamento', 'Valor (R$)', 'Tipo', 'Vencimento do empréstimo', 'Observações']]
  const list = views.flatMap((v) => v.payments.map((p) => ({ v, p })))
    .sort((a, b) => b.p.paid_at.localeCompare(a.p.paid_at))
  for (const { v, p } of list)
    rows.push([v.personName, fmtDate(p.paid_at), num2(toCents(p.amount)), p.kind === 'juros' ? 'Só juros' : 'Pagamento', fmtDate(v.dueDate), p.notes ?? ''])
  download(`${name}-${todayStr()}.csv`, toCsv(rows))
}

export function exportPeople(people: Person[]): void {
  const rows: (string | number)[][] = [['Nome', 'Telefone', 'CPF', 'Observações']]
  for (const p of people) rows.push([p.name, p.phone ?? '', p.cpf ?? '', p.notes ?? ''])
  download(`pessoas-${todayStr()}.csv`, toCsv(rows))
}

export function exportBackup(people: Person[], loans: Loan[], payments: Payment[], installments: Installment[] = []): void {
  const json = JSON.stringify({ gerado_em: new Date().toISOString(), pessoas: people, emprestimos: loans, pagamentos: payments, parcelas: installments }, null, 2)
  download(`backup-emprestimos-${todayStr()}.json`, json, 'application/json')
}
