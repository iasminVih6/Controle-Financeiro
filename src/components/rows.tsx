import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { LoanView } from '../lib/calc'
import { fmt } from '../lib/money'
import { fmtDate } from '../lib/dates'
import { Card, StatusBadge } from './ui'

function dueText(v: LoanView): string {
  if (v.status === 'quitado') return 'Quitado'
  const d = v.daysToDue
  const pre = v.parcelLabel ? `${v.parcelLabel} · ` : ''
  if (d < 0) return `${pre}Venceu há ${-d} ${-d === 1 ? 'dia' : 'dias'} (${fmtDate(v.dueDate)})`
  if (d === 0) return `${pre}Vence hoje`
  return `${pre}Vence em ${d} ${d === 1 ? 'dia' : 'dias'} (${fmtDate(v.dueDate)})`
}

export function LoanRow({ v }: { v: LoanView }) {
  return (
    <Link to={`/emprestimos/${v.loan.id}`} className="block">
      <Card className="flex items-center gap-3 active:bg-ink/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-base font-bold">{v.personName}</p>
            <StatusBadge status={v.status} partial={v.partial} />
          </div>
          <p className="mt-0.5 text-sm text-ink/60">{dueText(v)}</p>
          <p className="mt-1 text-sm">
            {v.status === 'quitado'
              ? <>Total pago: <b>{fmt(v.paidC)}</b></>
              : <>Falta pagar: <b className={v.status === 'atrasado' ? 'text-brick' : ''}>{fmt(v.balanceC)}</b> <span className="text-ink/50">de {fmt(v.totalC)}</span></>}
          </p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-ink/30" />
      </Card>
    </Link>
  )
}

export function LoanTabs({ active }: { active: 'lista' | 'vencimentos' }) {
  const cls = (on: boolean) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold ${on ? 'bg-white shadow-sm' : 'text-ink/60'}`
  return (
    <div className="mb-4 flex gap-1 rounded-2xl bg-ink/10 p-1">
      <Link to="/emprestimos" className={cls(active === 'lista')}>Todos</Link>
      <Link to="/vencimentos" className={cls(active === 'vencimentos')}>Vencimentos</Link>
    </div>
  )
}
