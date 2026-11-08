import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import type { LoanView, Status } from '../lib/calc'
import { fmt } from '../lib/money'
import { Btn, Card, Empty, PageHeader, SectionTitle } from '../components/ui'
import { LoanRow, LoanTabs } from '../components/rows'
import { LoanForm } from '../components/forms'

const groups: { status: Status; title: string; empty: string }[] = [
  { status: 'atrasado', title: 'Atrasados', empty: 'Ninguém atrasado.' },
  { status: 'hoje', title: 'Vencendo hoje', empty: 'Nada vence hoje.' },
  { status: 'proximo', title: 'Próximos vencimentos (7 dias)', empty: 'Nada vence nos próximos 7 dias.' },
  { status: 'emdia', title: 'Em dia', empty: 'Nenhum empréstimo em dia.' },
  { status: 'quitado', title: 'Quitados', empty: 'Nenhum empréstimo quitado.' },
]

export default function Due() {
  const { views, totals: t } = useData()
  const [open, setOpen] = useState(false)

  // Quem está devendo (soma por pessoa)
  const byPerson = new Map<string, { name: string; balance: number; late: boolean }>()
  for (const v of views) {
    if (v.balanceC <= 0) continue
    const cur = byPerson.get(v.loan.person_id) ?? { name: v.personName, balance: 0, late: false }
    cur.balance += v.balanceC
    cur.late = cur.late || v.status === 'atrasado'
    byPerson.set(v.loan.person_id, cur)
  }
  const debtors = [...byPerson.values()].sort((a, b) => b.balance - a.balance)
  const pick = (s: Status): LoanView[] =>
    views.filter((v) => v.status === s).sort((a, b) =>
      s === 'quitado' ? b.loan.due_date.localeCompare(a.loan.due_date) : a.loan.due_date.localeCompare(b.loan.due_date))

  return (
    <>
      <PageHeader title="Empréstimos" action={<Btn onClick={() => setOpen(true)}><Plus size={20} /> Novo</Btn>} />
      <LoanTabs active="vencimentos" />
      <Card className="bg-pine text-white">
        <p className="text-sm text-white/80">Total que falta receber</p>
        <p className="text-3xl font-extrabold">{fmt(t.balanceC)}</p>
      </Card>

      <SectionTitle>Quem está devendo</SectionTitle>
      {debtors.length === 0 ? <Empty text="Ninguém está devendo no momento." /> : (
        <Card className="divide-y divide-ink/10 !p-0">
          {debtors.map((d) => (
            <div key={d.name} className="flex items-center justify-between px-4 py-3">
              <span className="font-bold">{d.name}</span>
              <b className={d.late ? 'text-brick' : ''}>{fmt(d.balance)}</b>
            </div>
          ))}
        </Card>
      )}

      {groups.map((g) => {
        const list = pick(g.status)
        return (
          <section key={g.status}>
            <SectionTitle>{g.title} {list.length > 0 && <span className="text-ink/50">({list.length})</span>}</SectionTitle>
            {list.length === 0 ? <p className="text-sm text-ink/55">{g.empty}</p> : <div className="space-y-2">{list.map((v) => <LoanRow key={v.loan.id} v={v} />)}</div>}
          </section>
        )
      })}
      {open && <LoanForm onClose={() => setOpen(false)} />}
    </>
  )
}
