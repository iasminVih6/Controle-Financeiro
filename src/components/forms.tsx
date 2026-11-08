import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/errors'
import { useData } from '../lib/data'
import { centsToInput, fmt, interestCents, parseMoney, parseRate, toCents } from '../lib/money'
import { fmtDate, todayStr } from '../lib/dates'
import { maskCpf, maskPhone, validCpf } from '../lib/cpf'
import type { Loan, Payment, Person } from '../lib/types'
import { Btn, Field, inputCls, Modal, useUI } from './ui'

/* ===================== PESSOA ===================== */
export function PersonForm({ person, onClose, onSaved }: { person?: Person; onClose: () => void; onSaved?: (id: string) => void }) {
  const { refresh } = useData()
  const { toast } = useUI()
  const [name, setName] = useState(person?.name ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [cpf, setCpf] = useState(person?.cpf ?? '')
  const [notes, setNotes] = useState(person?.notes ?? '')
  const [err, setErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Informe o nome completo.'
    if (cpf && !validCpf(cpf)) e.cpf = 'CPF inválido. Confira os números ou deixe em branco.'
    if (phone && phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone incompleto. Use DDD + número.'
    setErr(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const row = { name: name.trim(), phone: phone || null, cpf: cpf || null, notes: notes.trim() || null }
    try {
      if (person) {
        const { error } = await supabase.from('people').update(row).eq('id', person.id)
        if (error) throw error
        await refresh()
        toast('Cadastro atualizado.')
        onSaved?.(person.id)
      } else {
        const { data, error } = await supabase.from('people').insert(row).select('id').single()
        if (error) throw error
        await refresh()
        toast('Pessoa cadastrada.')
        onSaved?.(data.id as string)
      }
      onClose()
    } catch (x) {
      toast(errMsg(x), 'erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={person ? 'Editar pessoa' : 'Nova pessoa'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nome completo *" error={err.name}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Telefone" error={err.phone}>
          <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(15) 99999-9999" />
        </Field>
        <Field label="CPF" error={err.cpf}>
          <input className={inputCls} inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" />
        </Field>
        <Field label="Observações">
          <textarea className={`${inputCls} py-3`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Btn className="w-full" loading={saving} onClick={save}>Salvar</Btn>
      </div>
    </Modal>
  )
}

/* ===================== EMPRÉSTIMO ===================== */
export function LoanForm({ loan, personId, onClose, onSaved }: { loan?: Loan; personId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { people, views, refresh } = useData()
  const { toast } = useUI()
  const [pid, setPid] = useState(loan?.person_id ?? personId ?? '')
  const [principal, setPrincipal] = useState(loan ? centsToInput(toCents(loan.principal)) : '')
  const [rate, setRate] = useState(loan ? String(loan.interest_rate).replace('.', ',') : '')
  const [loanDate, setLoanDate] = useState(loan?.loan_date ?? todayStr())
  const [dueDate, setDueDate] = useState(loan?.due_date ?? '')
  const [notes, setNotes] = useState(loan?.notes ?? '')
  const [err, setErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const pC = parseMoney(principal)
  const r = parseRate(rate)
  const preview = useMemo(() => {
    if (pC === null || r === null || pC <= 0) return null
    const j = interestCents(pC, r)
    return { j, total: pC + j }
  }, [pC, r])
  const paidSoFar = loan ? views.find((v) => v.loan.id === loan.id)?.paidC ?? 0 : 0

  const save = async () => {
    const e: Record<string, string> = {}
    if (!pid) e.pid = 'Escolha a pessoa.'
    if (pC === null || pC <= 0) e.principal = 'Informe um valor maior que zero. Ex.: 200,00'
    if (r === null) e.rate = 'Informe a taxa. Ex.: 10'
    if (!loanDate) e.loanDate = 'Informe a data do empréstimo.'
    if (!dueDate) e.dueDate = 'Informe a data de vencimento.'
    else if (loanDate && dueDate < loanDate) e.dueDate = 'O vencimento não pode ser antes do empréstimo.'
    if (preview && preview.total < paidSoFar) e.principal = `O total (${fmt(preview.total)}) ficaria menor do que já foi pago (${fmt(paidSoFar)}).`
    setErr(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const row = {
      person_id: pid,
      principal: (pC as number) / 100,
      interest_rate: r as number,
      loan_date: loanDate,
      due_date: dueDate,
      notes: notes.trim() || null,
    }
    try {
      if (loan) {
        const { error } = await supabase.from('loans').update(row).eq('id', loan.id)
        if (error) throw error
        await refresh()
        toast('Empréstimo atualizado.')
        onSaved?.(loan.id)
      } else {
        const { data, error } = await supabase.from('loans').insert(row).select('id').single()
        if (error) throw error
        await refresh()
        toast('Empréstimo cadastrado.')
        onSaved?.(data.id as string)
      }
      onClose()
    } catch (x) {
      toast(errMsg(x), 'erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={loan ? 'Editar empréstimo' : 'Novo empréstimo'} onClose={onClose}>
      {people.length === 0 ? (
        <p className="text-[15px]">Cadastre uma pessoa primeiro (menu Pessoas) para poder registrar o empréstimo.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Pessoa *" error={err.pid}>
            <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Escolha…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor emprestado (R$) *" error={err.principal}>
              <input className={inputCls} inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="200,00" />
            </Field>
            <Field label="Juros (%) *" error={err.rate}>
              <input className={inputCls} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="10" />
            </Field>
          </div>
          {preview && (
            <div className="rounded-2xl bg-pine-soft p-4 text-sm">
              <div className="flex justify-between"><span>Capital</span><b>{fmt(pC as number)}</b></div>
              <div className="flex justify-between"><span>Juros ({String(r).replace('.', ',')}%)</span><b>{fmt(preview.j)}</b></div>
              <div className="mt-1 flex justify-between border-t border-pine/20 pt-1 text-base"><span>Total a receber</span><b>{fmt(preview.total)}</b></div>
              <div className="flex justify-between text-pine-dark"><span>Lucro previsto</span><b>{fmt(preview.j)}</b></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data do empréstimo *" error={err.loanDate}>
              <input type="date" className={inputCls} value={loanDate} onChange={(e) => setLoanDate(e.target.value)} />
            </Field>
            <Field label="Vencimento *" error={err.dueDate}>
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Observações">
            <textarea className={`${inputCls} py-3`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Btn className="w-full" loading={saving} onClick={save}>Salvar empréstimo</Btn>
        </div>
      )}
    </Modal>
  )
}

/* ===================== PAGAMENTO ===================== */
export function PaymentForm({ loanId, payment, onClose }: { loanId?: string; payment?: Payment; onClose: () => void }) {
  const { views, refresh } = useData()
  const { toast } = useUI()
  const [lid, setLid] = useState(payment?.loan_id ?? loanId ?? '')
  const [amount, setAmount] = useState(payment ? centsToInput(toCents(payment.amount)) : '')
  const [date, setDate] = useState(payment?.paid_at ?? todayStr())
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [err, setErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Para editar um pagamento, o saldo disponível desconta os OUTROS pagamentos (não ele mesmo).
  const options = views.filter((v) => v.status !== 'quitado' || v.loan.id === lid)
  const view = views.find((v) => v.loan.id === lid)
  const ownC = payment && view ? toCents(payment.amount) : 0
  const availableC = view ? view.balanceC + ownC : 0
  const aC = parseMoney(amount)
  const over = view && aC !== null && aC > availableC

  const save = async (valueC?: number) => {
    const e: Record<string, string> = {}
    const v = valueC ?? aC
    if (!lid) e.lid = 'Escolha o empréstimo.'
    if (v === null || v <= 0) e.amount = 'Informe um valor maior que zero.'
    if (!date) e.date = 'Informe a data do pagamento.'
    setErr(e)
    if (Object.keys(e).length || v === null) return
    if (v > availableC) return // tratado pelo aviso na tela
    setSaving(true)
    const row = { loan_id: lid, amount: v / 100, paid_at: date, notes: notes.trim() || null }
    try {
      if (payment) {
        const { error } = await supabase.from('payments').update(row).eq('id', payment.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('payments').insert(row)
        if (error) throw error
      }
      await refresh()
      toast(v === availableC ? 'Pagamento registrado. Empréstimo quitado!' : 'Pagamento registrado.')
      onClose()
    } catch (x) {
      toast(errMsg(x), 'erro')
    } finally {
      setSaving(false)
    }
  }

  const after = view && aC !== null && !over ? availableC - aC : null

  return (
    <Modal title={payment ? 'Editar pagamento' : 'Registrar pagamento'} onClose={onClose}>
      {options.length === 0 ? (
        <p className="text-[15px]">Não há empréstimos em aberto para receber.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Empréstimo *" error={err.lid}>
            <select className={inputCls} value={lid} disabled={Boolean(payment)} onChange={(e) => setLid(e.target.value)}>
              <option value="">Escolha…</option>
              {options.map((o) => (
                <option key={o.loan.id} value={o.loan.id}>
                  {o.personName} — falta {fmt(o.balanceC)} (venc. {fmtDate(o.loan.due_date)})
                </option>
              ))}
            </select>
          </Field>
          {view && (
            <div className="rounded-2xl bg-pine-soft p-4 text-sm">
              <div className="flex justify-between"><span>Total do empréstimo</span><b>{fmt(view.totalC)}</b></div>
              <div className="flex justify-between"><span>Saldo a receber</span><b>{fmt(availableC)}</b></div>
            </div>
          )}
          <Field label="Valor recebido (R$) *" error={err.amount}>
            <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100,00" />
          </Field>
          {view && availableC > 0 && (
            <Btn variant="secondary" className="w-full" onClick={() => setAmount(centsToInput(availableC))}>
              Receber o saldo todo ({fmt(availableC)})
            </Btn>
          )}
          {over && view && (
            <div className="rounded-2xl bg-gold-soft p-4 text-sm text-ink">
              <p className="font-bold text-gold">O valor é maior que o saldo</p>
              <p className="mt-1">Você digitou {fmt(aC as number)}, mas só faltam {fmt(availableC)}. Não é possível registrar mais do que o devido.</p>
              <Btn className="mt-3 w-full" loading={saving} onClick={() => { setAmount(centsToInput(availableC)); void save(availableC) }}>
                Registrar só o saldo ({fmt(availableC)})
              </Btn>
            </div>
          )}
          {after !== null && (
            <p className="text-sm text-ink/70">
              {after === 0 ? 'Com este pagamento o empréstimo fica quitado.' : `Saldo restante depois deste pagamento: ${fmt(after)}`}
            </p>
          )}
          <Field label="Data do pagamento *" error={err.date}>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Observações">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Btn className="w-full" loading={saving && !over} disabled={Boolean(over)} onClick={() => save()}>Salvar pagamento</Btn>
        </div>
      )}
    </Modal>
  )
}
