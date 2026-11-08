import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, HandCoins, Pencil, Trash2 } from 'lucide-react'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/errors'
import { fmt } from '../lib/money'
import { Btn, Card, Empty, SectionTitle, useUI } from '../components/ui'
import { LoanRow } from '../components/rows'
import { LoanForm, PersonForm } from '../components/forms'

export default function PersonDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { people, views, refresh } = useData()
  const { confirm, toast } = useUI()
  const [modal, setModal] = useState<'edit' | 'loan' | null>(null)
  const person = people.find((p) => p.id === id)

  if (!person) return <Empty text="Pessoa não encontrada." action={<Link to="/pessoas"><Btn>Voltar</Btn></Link>} />

  const mine = views.filter((v) => v.loan.person_id === id).sort((a, b) => b.loan.loan_date.localeCompare(a.loan.loan_date))
  const lent = mine.reduce((s, v) => s + v.capitalC, 0)
  const paid = mine.reduce((s, v) => s + v.paidC, 0)
  const balance = mine.reduce((s, v) => s + v.balanceC, 0)
  const profit = mine.reduce((s, v) => s + v.interestRecC, 0)

  const remove = async () => {
    if (mine.length > 0) {
      toast('Esta pessoa tem empréstimos registrados. Para preservar o histórico financeiro, ela não pode ser excluída.', 'erro')
      return
    }
    const ok = await confirm({ title: 'Excluir pessoa?', message: `Excluir o cadastro de ${person.name}? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) return toast(errMsg(error), 'erro')
    await refresh()
    toast('Cadastro excluído.')
    nav('/pessoas')
  }

  return (
    <>
      <Link to="/pessoas" className="mb-3 inline-flex min-h-11 items-center gap-1 font-bold text-pine"><ArrowLeft size={18} /> Pessoas</Link>
      <h1 className="text-2xl font-extrabold">{person.name}</h1>
      <Card className="mt-3 space-y-1 text-[15px]">
        <p><span className="text-ink/60">Telefone:</span> {person.phone || '—'}</p>
        <p><span className="text-ink/60">CPF:</span> {person.cpf || '—'}</p>
        {person.notes && <p><span className="text-ink/60">Observações:</span> {person.notes}</p>}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card><p className="text-[13px] font-semibold text-ink/60">Total emprestado</p><p className="text-xl font-extrabold">{fmt(lent)}</p></Card>
        <Card><p className="text-[13px] font-semibold text-ink/60">Total já pago</p><p className="text-xl font-extrabold">{fmt(paid)}</p></Card>
        <Card className={balance > 0 ? 'bg-gold-soft' : ''}><p className="text-[13px] font-semibold text-ink/60">Saldo devedor</p><p className="text-xl font-extrabold">{fmt(balance)}</p></Card>
        <Card className="bg-pine-soft"><p className="text-[13px] font-semibold text-ink/60">Lucro gerado</p><p className="text-xl font-extrabold">{fmt(profit)}</p></Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Btn onClick={() => setModal('loan')}><HandCoins size={18} /> Empréstimo</Btn>
        <Btn variant="secondary" onClick={() => setModal('edit')}><Pencil size={18} /> Editar</Btn>
        <Btn variant="secondary" className="text-brick" onClick={remove}><Trash2 size={18} /> Excluir</Btn>
      </div>

      <SectionTitle>Histórico de empréstimos</SectionTitle>
      {mine.length === 0 ? <Empty text="Nenhum empréstimo para esta pessoa." /> : <div className="space-y-2">{mine.map((v) => <LoanRow key={v.loan.id} v={v} />)}</div>}

      {modal === 'edit' && <PersonForm person={person} onClose={() => setModal(null)} />}
      {modal === 'loan' && <LoanForm personId={id} onClose={() => setModal(null)} />}
    </>
  )
}
