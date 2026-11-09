import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { fmt, toCents } from '../lib/money'
import { fmtDate } from '../lib/dates'
import { Btn, Card, Empty, inputCls, PageHeader } from '../components/ui'
import { PaymentForm } from '../components/forms'

export default function Payments() {
  const { payments, views, people } = useData()
  const [open, setOpen] = useState(false)
  const [person, setPerson] = useState('')
  const byLoan = new Map(views.map((v) => [v.loan.id, v]))

  const list = payments.filter((p) => !person || byLoan.get(p.loan_id)?.loan.person_id === person)
  const total = list.reduce((s, p) => s + toCents(p.amount), 0)

  return (
    <>
      <PageHeader title="Pagamentos" action={<Btn onClick={() => setOpen(true)}><Plus size={20} /> Novo</Btn>} />
      {payments.length > 0 && (
        <>
          <select className={`${inputCls} mb-3`} value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Filtrar por pessoa">
            <option value="">Todas as pessoas</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Card className="mb-3 bg-pine-soft"><span className="text-sm text-ink/70">Total recebido{person ? ' (filtro)' : ''}: </span><b className="text-lg">{fmt(total)}</b></Card>
        </>
      )}
      {payments.length === 0 ? (
        <Empty text="Nenhum pagamento recebido ainda." action={<Btn onClick={() => setOpen(true)}><Plus size={18} /> Registrar pagamento</Btn>} />
      ) : list.length === 0 ? <Empty text="Nenhum pagamento para este filtro." /> : (
        <Card className="divide-y divide-ink/10 !p-0">
          {list.map((p) => {
            const v = byLoan.get(p.loan_id)
            return (
              <Link key={p.id} to={`/emprestimos/${p.loan_id}`} className="flex items-center justify-between px-4 py-3 active:bg-ink/5">
                <div>
                  <p className="font-bold">{v?.personName ?? '—'}</p>
                  <p className="text-sm text-ink/60">{fmtDate(p.paid_at)}{p.kind === 'juros' ? ' · Só juros' : ''}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <b className="text-pine">{fmt(toCents(p.amount))}</b>
              </Link>
            )
          })}
        </Card>
      )}
      {open && <PaymentForm onClose={() => setOpen(false)} />}
    </>
  )
}
