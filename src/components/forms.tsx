import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/errors'
import { useData } from '../lib/data'
import { centsToInput, fmt, interestCents, parseMoney, parseRate, splitInstallments, toCents } from '../lib/money'
import { addMonths, fmtDate, todayStr } from '../lib/dates'
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
const genDates = (first: string, n: number): string[] =>
  first ? Array.from({ length: n }, (_, i) => addMonths(first, i)) : Array<string>(n).fill('')

export function LoanForm({ loan, personId, onClose, onSaved }: { loan?: Loan; personId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { people, views, payments, refresh } = useData()
  const { toast } = useUI()
  const existing = loan ? views.find((v) => v.loan.id === loan.id) : undefined
  const hadInst = (existing?.insts.length ?? 0) > 0
  const hasInterestPays = loan ? payments.some((p) => p.loan_id === loan.id && p.kind === 'juros') : false

  const [pid, setPid] = useState(loan?.person_id ?? personId ?? '')
  const [principal, setPrincipal] = useState(loan ? centsToInput(toCents(loan.principal)) : '')
  const [rate, setRate] = useState(loan ? String(loan.interest_rate).replace('.', ',') : '')
  const [loanDate, setLoanDate] = useState(loan?.loan_date ?? todayStr())
  const [dueDate, setDueDate] = useState(hadInst ? existing!.insts[0].inst.due_date : loan?.due_date ?? '')
  const [notes, setNotes] = useState(loan?.notes ?? '')
  const [parcelar, setParcelar] = useState(hadInst)
  const [nStr, setNStr] = useState(hadInst ? String(existing!.insts.length) : '2')
  const [dates, setDates] = useState<string[]>(hadInst ? existing!.insts.map((i) => i.inst.due_date) : [])
  const [err, setErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const pC = parseMoney(principal)
  const r = parseRate(rate)
  const n = Math.round(Number(nStr))
  const nOk = Number.isInteger(n) && n >= 2 && n <= 60
  const preview = useMemo(() => {
    if (pC === null || r === null || pC <= 0) return null
    const j = interestCents(pC, r)
    return { j, total: pC + j }
  }, [pC, r])
  const amounts = useMemo(() => (parcelar && nOk && preview ? splitInstallments(preview.total, n) : []), [parcelar, nOk, n, preview])
  const paidSoFar = existing?.normalPaidC ?? 0

  const changeDue = (v: string) => {
    setDueDate(v)
    if (parcelar && nOk) setDates(genDates(v, n))
  }
  const changeN = (v: string) => {
    setNStr(v)
    const k = Math.round(Number(v))
    if (parcelar && Number.isInteger(k) && k >= 2 && k <= 60) setDates(genDates(dueDate, k))
  }
  const toggleParcelar = (on: boolean) => {
    setParcelar(on)
    if (on && nOk) setDates(genDates(dueDate, n))
  }

  const save = async () => {
    const e: Record<string, string> = {}
    if (!pid) e.pid = 'Escolha a pessoa.'
    if (pC === null || pC <= 0) e.principal = 'Informe um valor maior que zero. Ex.: 200,00'
    if (r === null) e.rate = 'Informe a taxa. Ex.: 10'
    if (!loanDate) e.loanDate = 'Informe a data do empréstimo.'
    if (!dueDate) e.dueDate = parcelar ? 'Informe o vencimento da 1ª parcela.' : 'Informe a data de vencimento.'
    else if (loanDate && dueDate < loanDate) e.dueDate = 'O vencimento não pode ser antes do empréstimo.'
    if (preview && preview.total < paidSoFar) e.principal = `O total (${fmt(preview.total)}) ficaria menor do que já foi pago (${fmt(paidSoFar)}).`
    if (parcelar) {
      if (!nOk) e.n = 'Informe de 2 a 60 parcelas.'
      else if (dates.length !== n || dates.some((d) => !d)) e.dates = 'Preencha a data de todas as parcelas.'
      else if (dates.some((d, i) => d < loanDate || (i > 0 && d < dates[i - 1]))) e.dates = 'As datas das parcelas devem estar em ordem e não podem ser antes do empréstimo.'
    }
    setErr(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const items = parcelar ? amounts.map((a, i) => ({ number: i + 1, amount: a / 100, due_date: dates[i] })) : []
    const row = {
      person_id: pid,
      principal: (pC as number) / 100,
      interest_rate: r as number,
      loan_date: loanDate,
      due_date: parcelar ? dates[n - 1] : dueDate, // empréstimo parcelado: vencimento final = última parcela
      notes: notes.trim() || null,
    }
    let createdId: string | null = null
    try {
      if (loan) {
        const { error } = await supabase.from('loans').update(row).eq('id', loan.id)
        if (error) throw error
        if (parcelar || hadInst) {
          const { error: e2 } = await supabase.rpc('save_installments', { p_loan_id: loan.id, p_items: items })
          if (e2) throw e2
        }
        await refresh()
        toast('Empréstimo atualizado.')
        onSaved?.(loan.id)
      } else {
        const { data, error } = await supabase.from('loans').insert(row).select('id').single()
        if (error) throw error
        createdId = data.id as string
        if (parcelar) {
          const { error: e2 } = await supabase.rpc('save_installments', { p_loan_id: createdId, p_items: items })
          if (e2) {
            await supabase.from('loans').delete().eq('id', createdId) // desfaz: não deixa empréstimo sem parcelas
            createdId = null
            throw e2
          }
        }
        await refresh()
        toast(parcelar ? `Empréstimo parcelado em ${n}x cadastrado.` : 'Empréstimo cadastrado.')
        onSaved?.(createdId as string)
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
              {amounts.length > 0 && (
                <div className="mt-1 flex justify-between border-t border-pine/20 pt-1 text-pine-dark">
                  <span>{n} parcelas de</span><b>{fmt(amounts[0])}{amounts[n - 1] !== amounts[0] ? ` (última ${fmt(amounts[n - 1])})` : ''}</b>
                </div>
              )}
            </div>
          )}
          <div className={parcelar ? '' : 'grid grid-cols-2 gap-3'}>
            <Field label="Data do empréstimo *" error={err.loanDate}>
              <input type="date" className={inputCls} value={loanDate} onChange={(e) => setLoanDate(e.target.value)} />
            </Field>
            {!parcelar && (
              <Field label="Vencimento *" error={err.dueDate}>
                <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            )}
          </div>

          <label className={`flex min-h-12 items-center gap-3 rounded-2xl border border-ink/20 bg-white px-4 ${hasInterestPays ? 'opacity-50' : ''}`}>
            <input type="checkbox" className="h-5 w-5 accent-pine" checked={parcelar} disabled={hasInterestPays}
              onChange={(e) => toggleParcelar(e.target.checked)} />
            <span className="font-semibold">Parcelar este empréstimo</span>
          </label>
          {hasInterestPays && <p className="-mt-2 text-xs text-ink/55">Este empréstimo já tem pagamento só de juros e não pode ser parcelado.</p>}

          {parcelar && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nº de parcelas *" error={err.n}>
                  <input className={inputCls} inputMode="numeric" value={nStr} onChange={(e) => changeN(e.target.value.replace(/\D/g, ''))} placeholder="6" />
                </Field>
                <Field label="Vencimento da 1ª parcela *" error={err.dueDate}>
                  <input type="date" className={inputCls} value={dueDate} onChange={(e) => changeDue(e.target.value)} />
                </Field>
              </div>
              {nOk && dates.length === n && (
                <div className="rounded-2xl bg-white p-3">
                  <p className="mb-2 text-sm font-semibold text-ink/80">Parcelas e vencimentos (pode ajustar cada data)</p>
                  <div className="space-y-2">
                    {dates.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-sm font-bold">{i + 1}/{n}</span>
                        <span className="w-24 shrink-0 text-sm">{amounts[i] !== undefined ? fmt(amounts[i]) : '—'}</span>
                        <input type="date" aria-label={`Vencimento da parcela ${i + 1}`} className={`${inputCls} !min-h-11`} value={d}
                          onChange={(e) => setDates((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))} />
                      </div>
                    ))}
                  </div>
                  {err.dates && <p className="mt-2 text-sm font-semibold text-brick">{err.dates}</p>}
                </div>
              )}
            </>
          )}

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
const suggestDue = (due: string): string => {
  const next = addMonths(due, 1)
  return next < todayStr() ? addMonths(todayStr(), 1) : next
}

export function PaymentForm({ loanId, payment, onClose }: { loanId?: string; payment?: Payment; onClose: () => void }) {
  const { views, refresh } = useData()
  const { toast } = useUI()
  const [lid, setLid] = useState(payment?.loan_id ?? loanId ?? '')
  const [kind, setKind] = useState<'normal' | 'juros'>(payment?.kind === 'juros' ? 'juros' : 'normal')
  const [amount, setAmount] = useState(payment ? centsToInput(toCents(payment.amount)) : '')
  const [date, setDate] = useState(payment?.paid_at ?? todayStr())
  const [newDue, setNewDue] = useState('')
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [err, setErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const options = views.filter((v) => v.status !== 'quitado' || v.loan.id === lid)
  const view = views.find((v) => v.loan.id === lid)
  const isJuros = kind === 'juros'
  const canJuros = Boolean(view) && (view?.insts.length ?? 0) === 0 && (view?.interestC ?? 0) > 0
  // Ao editar um pagamento normal, o saldo disponível desconta os OUTROS pagamentos (não ele mesmo).
  const ownC = payment && payment.kind !== 'juros' && view ? toCents(payment.amount) : 0
  const availableC = view ? view.balanceC + ownC : 0
  const limitC = isJuros ? view?.interestC ?? 0 : availableC
  const aC = parseMoney(amount)
  const over = Boolean(view) && aC !== null && aC > limitC
  const dueValue = newDue || (view ? suggestDue(view.dueDate) : '')

  const save = async (valueC?: number) => {
    const e: Record<string, string> = {}
    const v = valueC ?? aC
    if (!lid) e.lid = 'Escolha o empréstimo.'
    if (v === null || v <= 0) e.amount = 'Informe um valor maior que zero.'
    if (!date) e.date = 'Informe a data do pagamento.'
    if (isJuros && !payment) {
      if (!dueValue) e.due = 'Informe o novo vencimento.'
      else if (view && dueValue < view.loan.loan_date) e.due = 'O novo vencimento não pode ser antes do empréstimo.'
    }
    setErr(e)
    if (Object.keys(e).length || v === null) return
    if (v > limitC) return // tratado pelo aviso na tela
    setSaving(true)
    const row = { loan_id: lid, amount: v / 100, paid_at: date, notes: notes.trim() || null }
    try {
      if (payment) {
        const { error } = await supabase.from('payments').update(row).eq('id', payment.id)
        if (error) throw error
      } else if (isJuros) {
        const { error } = await supabase.rpc('register_interest_payment', {
          p_loan_id: lid, p_amount: v / 100, p_paid_at: date, p_notes: row.notes, p_new_due: dueValue || null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('payments').insert({ ...row, kind: 'normal' })
        if (error) throw error
      }
      await refresh()
      toast(isJuros ? 'Pagamento de juros registrado.' : v === availableC ? 'Pagamento registrado. Empréstimo quitado!' : 'Pagamento registrado.')
      onClose()
    } catch (x) {
      toast(errMsg(x), 'erro')
    } finally {
      setSaving(false)
    }
  }

  const after = view && aC !== null && !over && !isJuros ? availableC - aC : null
  const segCls = (on: boolean) => `flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold ${on ? 'bg-white shadow-sm' : 'text-ink/60'}`

  return (
    <Modal title={payment ? 'Editar pagamento' : 'Registrar pagamento'} onClose={onClose}>
      {options.length === 0 ? (
        <p className="text-[15px]">Não há empréstimos em aberto para receber.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Empréstimo *" error={err.lid}>
            <select className={inputCls} value={lid} disabled={Boolean(payment)} onChange={(e) => { setLid(e.target.value); setKind('normal'); setAmount(''); setNewDue('') }}>
              <option value="">Escolha…</option>
              {options.map((o) => (
                <option key={o.loan.id} value={o.loan.id}>
                  {o.personName} — falta {fmt(o.balanceC)} (venc. {fmtDate(o.dueDate)})
                </option>
              ))}
            </select>
          </Field>
          {!payment && view && canJuros && (
            <div className="flex gap-1 rounded-2xl bg-ink/10 p-1">
              <button type="button" className={segCls(!isJuros)} onClick={() => { setKind('normal'); setAmount('') }}>Pagamento</button>
              <button type="button" className={segCls(isJuros)} onClick={() => { setKind('juros'); setAmount('') }}>Só juros</button>
            </div>
          )}
          {!payment && view && view.insts.length > 0 && (
            <p className="text-xs text-ink/55">Empréstimo parcelado: os pagamentos quitam as parcelas da mais antiga para a mais nova.</p>
          )}
          {view && (
            <div className="rounded-2xl bg-pine-soft p-4 text-sm">
              <div className="flex justify-between"><span>Total do empréstimo</span><b>{fmt(view.totalC)}</b></div>
              <div className="flex justify-between"><span>Saldo a receber</span><b>{fmt(availableC)}</b></div>
              {isJuros && <div className="flex justify-between"><span>Juros do período</span><b>{fmt(view.interestC)}</b></div>}
            </div>
          )}
          <Field label={isJuros ? 'Valor dos juros pagos (R$) *' : 'Valor recebido (R$) *'} error={err.amount}>
            <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100,00" />
          </Field>
          {view && limitC > 0 && (
            <Btn variant="secondary" className="w-full" onClick={() => setAmount(centsToInput(limitC))}>
              {isJuros ? `Preencher com os juros (${fmt(limitC)})` : `Receber o saldo todo (${fmt(limitC)})`}
            </Btn>
          )}
          {over && view && (
            <div className="rounded-2xl bg-gold-soft p-4 text-sm text-ink">
              <p className="font-bold text-gold">{isJuros ? 'O valor é maior que os juros' : 'O valor é maior que o saldo'}</p>
              <p className="mt-1">
                Você digitou {fmt(aC as number)}, mas {isJuros ? `os juros são ${fmt(limitC)}` : `só faltam ${fmt(limitC)}`}.
                {isJuros ? ' Para pagar mais do que os juros, use "Pagamento".' : ' Não é possível registrar mais do que o devido.'}
              </p>
              <Btn className="mt-3 w-full" loading={saving} onClick={() => { setAmount(centsToInput(limitC)); void save(limitC) }}>
                {isJuros ? `Registrar só os juros (${fmt(limitC)})` : `Registrar só o saldo (${fmt(limitC)})`}
              </Btn>
            </div>
          )}
          {after !== null && (
            <p className="text-sm text-ink/70">
              {after === 0 ? 'Com este pagamento o empréstimo fica quitado.' : `Saldo restante depois deste pagamento: ${fmt(after)}`}
            </p>
          )}
          {isJuros && !payment && view && (
            <>
              <p className="rounded-2xl bg-white p-3 text-sm text-ink/80">
                O capital continua em aberto: o saldo segue em <b>{fmt(view.balanceC)}</b> e o vencimento é renovado.
              </p>
              <Field label="Novo vencimento *" error={err.due}>
                <input type="date" className={inputCls} value={dueValue} onChange={(e) => setNewDue(e.target.value)} />
              </Field>
            </>
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
