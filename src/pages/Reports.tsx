import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useData } from '../lib/data'
import { monthly, STATUS_LABEL, Status, totals } from '../lib/calc'
import { fmt } from '../lib/money'
import { monthLabel } from '../lib/dates'
import { exportLoans, exportPayments } from '../lib/exports'
import { Btn, Card, Empty, Field, inputCls, PageHeader, SectionTitle } from '../components/ui'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between py-2 ${strong ? 'font-extrabold' : ''}`}><span className={strong ? '' : 'text-ink/70'}>{label}</span><b>{value}</b></div>
}

export default function Reports() {
  const { views, people } = useData()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [person, setPerson] = useState('')
  const [status, setStatus] = useState<'' | Status>('')

  // Filtros: período (pela data do empréstimo), pessoa e situação.
  const filtered = useMemo(
    () => views.filter((v) =>
      (!from || v.loan.loan_date >= from) && (!to || v.loan.loan_date <= to) &&
      (!person || v.loan.person_id === person) && (!status || v.status === status)),
    [views, from, to, person, status],
  )
  const t = totals(filtered)
  const nPay = filtered.reduce((s, v) => s + v.payments.length, 0)
  const months = monthly(filtered)

  return (
    <>
      <PageHeader title="Relatórios" />
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="De"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Até"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Field label="Pessoa">
          <select className={inputCls} value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Todas</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Situação">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as '' | Status)}>
            <option value="">Todas</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        {(from || to || person || status) && (
          <Btn variant="ghost" onClick={() => { setFrom(''); setTo(''); setPerson(''); setStatus('') }}>Limpar filtros</Btn>
        )}
        <p className="text-xs text-ink/55">O período considera a data em que o empréstimo foi feito.</p>
      </Card>

      {filtered.length === 0 ? <div className="mt-4"><Empty text="Nenhum empréstimo encontrado com esses filtros." /></div> : (
        <>
          <SectionTitle>Capital</SectionTitle>
          <Card className="divide-y divide-ink/10">
            <Row label="Total de capital emprestado" value={fmt(t.lentC)} />
            <Row label="Capital já recuperado" value={fmt(t.lentC - t.capitalOpenC)} />
            <Row label="Capital ainda emprestado" value={fmt(t.capitalOpenC)} strong />
          </Card>
          <SectionTitle>Lucro (juros)</SectionTitle>
          <Card className="divide-y divide-ink/10">
            <Row label="Juros previstos (total)" value={fmt(t.interestTotalC)} />
            <Row label="Juros efetivamente recebidos" value={fmt(t.profitRealizedC)} strong />
            <Row label="Juros ainda a receber" value={fmt(t.profitForecastC)} />
          </Card>
          <SectionTitle>Pagamentos</SectionTitle>
          <Card className="divide-y divide-ink/10">
            <Row label="Quantidade de pagamentos" value={String(nPay)} />
            <Row label="Total recebido" value={fmt(t.receivedC)} strong />
            <Row label="Saldo a receber" value={fmt(t.balanceC)} />
          </Card>

          <SectionTitle>Histórico mensal</SectionTitle>
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <thead><tr className="border-b border-ink/10 text-sm text-ink/60"><th className="px-4 py-3">Mês</th><th className="px-2 py-3 text-right">Emprestado</th><th className="px-4 py-3 text-right">Recebido</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.key} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-3 font-bold">{monthLabel(m.key)}</td>
                      <td className="px-2 py-3 text-right">{fmt(m.lentC)}</td>
                      <td className="px-4 py-3 text-right font-bold text-pine">{fmt(m.receivedC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn variant="secondary" onClick={() => exportLoans(filtered)}><Download size={18} /> Empréstimos</Btn>
            <Btn variant="secondary" onClick={() => exportPayments(filtered)}><Download size={18} /> Pagamentos</Btn>
          </div>
          <p className="mt-2 text-xs text-ink/55">Os arquivos .csv abrem direto no Excel.</p>
        </>
      )}
    </>
  )
}
