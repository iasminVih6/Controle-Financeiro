import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { useData } from '../lib/data'
import { fmt } from '../lib/money'
import { Btn, Card, Empty, inputCls, PageHeader } from '../components/ui'
import { PersonForm } from '../components/forms'

export default function People() {
  const { people, views } = useData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const owed = (id: string) => views.filter((v) => v.loan.person_id === id).reduce((s, v) => s + v.balanceC, 0)
  const late = (id: string) => views.some((v) => v.loan.person_id === id && v.status === 'atrasado')

  return (
    <>
      <PageHeader title="Pessoas" action={<Btn onClick={() => setOpen(true)}><Plus size={20} /> Nova</Btn>} />
      {people.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input className={`${inputCls} pl-11`} placeholder="Buscar pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {people.length === 0 ? (
        <Empty text="Nenhuma pessoa cadastrada ainda." action={<Btn onClick={() => setOpen(true)}><Plus size={18} /> Cadastrar pessoa</Btn>} />
      ) : list.length === 0 ? (
        <Empty text="Ninguém encontrado com esse nome." />
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <Link key={p.id} to={`/pessoas/${p.id}`} className="block">
              <Card className="flex items-center gap-3 active:bg-ink/5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-sm text-ink/60">
                    {owed(p.id) > 0 ? <>Deve <b className={late(p.id) ? 'text-brick' : ''}>{fmt(owed(p.id))}</b></> : 'Sem saldo devedor'}
                  </p>
                </div>
                <ChevronRight size={20} className="text-ink/30" />
              </Card>
            </Link>
          ))}
        </div>
      )}
      {open && <PersonForm onClose={() => setOpen(false)} />}
    </>
  )
}
