import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import type { Status } from '../lib/calc'
import { Btn, Empty, PageHeader, Tabs } from '../components/ui'
import { LoanRow, LoanTabs } from '../components/rows'
import { LoanForm } from '../components/forms'

export default function Loans() {
  const { views } = useData()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<'todos' | 'abertos' | 'quitado'>('abertos')

  const list = views
    .filter((v) => (f === 'todos' ? true : f === 'quitado' ? v.status === 'quitado' : v.status !== ('quitado' as Status)))
    .sort((a, b) => b.loan.loan_date.localeCompare(a.loan.loan_date) || b.loan.created_at.localeCompare(a.loan.created_at))

  return (
    <>
      <PageHeader title="Empréstimos" action={<Btn onClick={() => setOpen(true)}><Plus size={20} /> Novo</Btn>} />
      <LoanTabs active="lista" />
      <Tabs value={f} onChange={(id) => setF(id as typeof f)} tabs={[{ id: 'abertos', label: 'Em aberto' }, { id: 'quitado', label: 'Quitados' }, { id: 'todos', label: 'Todos' }]} />
      {list.length === 0 ? (
        <Empty text={views.length === 0 ? 'Nenhum empréstimo registrado ainda.' : 'Nada nesta lista.'} action={views.length === 0 ? <Btn onClick={() => setOpen(true)}><Plus size={18} /> Novo empréstimo</Btn> : undefined} />
      ) : (
        <div className="space-y-2">{list.map((v) => <LoanRow key={v.loan.id} v={v} />)}</div>
      )}
      {open && <LoanForm onClose={() => setOpen(false)} />}
    </>
  )
}
