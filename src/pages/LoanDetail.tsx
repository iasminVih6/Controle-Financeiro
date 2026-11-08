import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Wallet } from 'lucide-react'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/errors'
import { fmt, toCents } from '../lib/money'
import { fmtDate } from '../lib/dates'
import type { Payment } from '../lib/types'
import { Btn, Card, Empty, SectionTitle, StatusBadge, useUI } from '../components/ui'
import { LoanForm, PaymentForm } from '../components/forms'

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between py-1.5 ${strong ? 'text-base font-extrabold' : 'text-[15px]'}`}><span className={strong ? '' : 'text-ink/65'}>{label}</span><span className="font-bold">{value}</span></div>
}

export default function LoanDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { views, refresh } = useData()
  const { confirm, toast } = useUI()
  const [modal, setModal] = useState<'edit' | 'pay' | null>(null)
  const [editPay, setEditPay] = useState<Payment | null>(null)
  const v = views.find((x) => x.loan.id === id)

  if (!v) return <Empty text="Empréstimo não encontrado." action={<Link to="/emprestimos"><Btn>Voltar</Btn></Link>} />

  const pct = v.totalC ? Math.min(100, Math.round((v.paidC / v.totalC) * 100)) : 0

  const removeLoan = async () => {
    if (v.payments.length > 0) {
      toast('Este empréstimo já tem pagamentos. Para preservar o histórico, exclua primeiro os pagamentos (se tiver certeza).', 'erro')
      return
    }
    const ok = await confirm({ title: 'Excluir empréstimo?', message: `Excluir o empréstimo de ${fmt(v.capitalC)} para ${v.personName}? Não poderá ser desfeito.`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (error) return toast(errMsg(error), 'erro')
    await refresh()
    toast('Empréstimo excluído.')
    nav('/emprestimos')
  }

  const removePay = async (p: Payment) => {
    const ok = await confirm({ title: 'Excluir pagamento?', message: `Excluir o pagamento de ${fmt(toCents(p.amount))} feito em ${fmtDate(p.paid_at)}? O saldo do empréstimo será recalculado.`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) return toast(errMsg(error), 'erro')
    await refresh()
    toast('Pagamento excluído.')
  }

  return (
    <>
      <Link to="/emprestimos" className="mb-3 inline-flex min-h-11 items-center gap-1 font-bold text-pine"><ArrowLeft size={18} /> Empréstimos</Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/pessoas/${v.loan.person_id}`} className="text-2xl font-extrabold underline decoration-ink/20">{v.personName}</Link>
          <p className="text-sm text-ink/60">Emprestado em {fmtDate(v.loan.loan_date)} · vence em {fmtDate(v.loan.due_date)}</p>
        </div>
        <StatusBadge status={v.status} partial={v.partial} />
      </div>

      <Card className="mt-4">
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-sm font-semibold"><span>Pago</span><span>{pct}%</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-pine" style={{ width: `${pct}%` }} /></div>
        </div>
        <Line label="Capital emprestado" value={fmt(v.capitalC)} />
        <Line label={`Juros (${String(v.loan.interest_rate).replace('.', ',')}%)`} value={fmt(v.interestC)} />
        <Line label="Total a receber" value={fmt(v.totalC)} strong />
        <div className="my-2 border-t border-ink/10" />
        <Line label="Total recebido" value={fmt(v.paidC)} />
        <Line label="Saldo restante" value={fmt(v.balanceC)} strong />
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="bg-gold-soft">
          <p className="text-[13px] font-semibold text-ink/60">Capital</p>
          <p className="text-sm">Recuperado: <b>{fmt(v.capitalRecC)}</b></p>
          <p className="text-sm">Falta: <b>{fmt(v.capitalOpenC)}</b></p>
        </Card>
        <Card className="bg-pine-soft">
          <p className="text-[13px] font-semibold text-ink/60">Lucro (juros)</p>
          <p className="text-sm">Recebido: <b>{fmt(v.interestRecC)}</b></p>
          <p className="text-sm">Previsto: <b>{fmt(v.interestOpenC)}</b></p>
        </Card>
      </div>
      <p className="mt-2 text-xs text-ink/55">Os pagamentos recuperam primeiro o capital; só depois entram como lucro.</p>
      {v.loan.notes && <Card className="mt-3 text-[15px]"><span className="text-ink/60">Observações:</span> {v.loan.notes}</Card>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Btn disabled={v.status === 'quitado'} onClick={() => setModal('pay')}><Wallet size={18} /> Receber</Btn>
        <Btn variant="secondary" onClick={() => setModal('edit')}><Pencil size={18} /> Editar</Btn>
        <Btn variant="secondary" className="text-brick" onClick={removeLoan}><Trash2 size={18} /> Excluir</Btn>
      </div>

      <SectionTitle>Histórico de pagamentos</SectionTitle>
      {v.payments.length === 0 ? <Empty text="Nenhum pagamento recebido ainda." /> : (
        <Card className="divide-y divide-ink/10 !p-0">
          {v.payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-pine">{fmt(toCents(p.amount))}</p>
                <p className="text-sm text-ink/60">{fmtDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
              </div>
              <button type="button" aria-label="Editar pagamento" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-ink/10" onClick={() => setEditPay(p)}><Pencil size={18} /></button>
              <button type="button" aria-label="Excluir pagamento" className="flex h-11 w-11 items-center justify-center rounded-full text-brick active:bg-brick-soft" onClick={() => removePay(p)}><Trash2 size={18} /></button>
            </div>
          ))}
        </Card>
      )}

      {modal === 'edit' && <LoanForm loan={v.loan} onClose={() => setModal(null)} />}
      {modal === 'pay' && <PaymentForm loanId={id} onClose={() => setModal(null)} />}
      {editPay && <PaymentForm payment={editPay} onClose={() => setEditPay(null)} />}
    </>
  )
}
