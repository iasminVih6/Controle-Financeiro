import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HandCoins, Plus, Wallet } from 'lucide-react'
import { useData } from '../lib/data'
import { monthly } from '../lib/calc'
import { fmt, toCents } from '../lib/money'
import { fmtDate, lastMonths, monthLabel } from '../lib/dates'
import { Btn, Card, Empty, PageHeader, SectionTitle } from '../components/ui'
import { LoanRow } from '../components/rows'
import { LoanForm, PaymentForm } from '../components/forms'

function Kpi({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <Card className={tone}>
      <p className="text-[13px] font-semibold text-ink/60">{label}</p>
      <p className="mt-1 text-xl font-extrabold leading-tight">{value}</p>
    </Card>
  )
}

export default function Dashboard() {
  const { views, totals: t, payments, people } = useData()
  const [modal, setModal] = useState<'loan' | 'pay' | null>(null)

  const late = views.filter((v) => v.status === 'atrasado').sort((a, b) => a.daysToDue - b.daysToDue)
  const upcoming = views
    .filter((v) => v.status === 'hoje' || v.status === 'proximo')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
  const recent = payments.slice(0, 5)
  const loanById = new Map(views.map((v) => [v.loan.id, v]))
  const chart = monthly(views, lastMonths(6)).map((m) => ({
    mes: monthLabel(m.key), Emprestado: m.lentC / 100, Recebido: m.receivedC / 100,
  }))

  return (
    <>
      <PageHeader title="Visão geral" />
      <div className="grid grid-cols-2 gap-3">
        <Btn className="py-4" onClick={() => setModal('loan')}><HandCoins size={20} /> Novo empréstimo</Btn>
        <Btn variant="secondary" className="py-4" onClick={() => setModal('pay')}><Wallet size={20} /> Registrar pagamento</Btn>
      </div>

      {views.length === 0 && (
        <div className="mt-5">
          <Empty
            text={people.length === 0 ? 'Comece cadastrando a primeira pessoa. Depois é só registrar o empréstimo.' : 'Nenhum empréstimo ainda. Registre o primeiro para ver os números aqui.'}
            action={people.length === 0 ? <Link to="/pessoas"><Btn><Plus size={18} /> Cadastrar pessoa</Btn></Link> : <Btn onClick={() => setModal('loan')}><Plus size={18} /> Novo empréstimo</Btn>}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Kpi label="Total emprestado" value={fmt(t.lentC)} />
        <Kpi label="Total recebido" value={fmt(t.receivedC)} />
        <Kpi label="Capital a receber" value={fmt(t.capitalOpenC)} />
        <Kpi label="Lucro previsto" value={fmt(t.profitForecastC)} tone="bg-gold-soft" />
        <Kpi label="Lucro realizado" value={fmt(t.profitRealizedC)} tone="bg-pine-soft" />
        <Kpi label="Empréstimos atrasados" value={String(t.late)} tone={t.late ? 'bg-brick-soft text-brick' : ''} />
        <Kpi label="Empréstimos ativos" value={String(t.active)} />
        <Kpi label="Empréstimos quitados" value={String(t.closed)} />
      </div>

      {late.length > 0 && (
        <>
          <SectionTitle right={<Link to="/vencimentos" className="text-sm font-bold text-pine">Ver todos</Link>}>Pagamentos atrasados</SectionTitle>
          <div className="space-y-2">{late.slice(0, 5).map((v) => <LoanRow key={v.loan.id} v={v} />)}</div>
        </>
      )}

      <SectionTitle>Emprestado x recebido</SectionTitle>
      <Card>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -12, right: 4, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v) => fmt(toCents(Number(v)))} />
              <Legend />
              <Bar dataKey="Emprestado" fill="#A8690D" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Recebido" fill="#0E6B5C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle right={<Link to="/vencimentos" className="text-sm font-bold text-pine">Vencimentos</Link>}>Próximos vencimentos</SectionTitle>
      {upcoming.length === 0
        ? <Empty text="Nenhum vencimento nos próximos 7 dias." />
        : <div className="space-y-2">{upcoming.map((v) => <LoanRow key={v.loan.id} v={v} />)}</div>}

      <SectionTitle right={<Link to="/pagamentos" className="text-sm font-bold text-pine">Ver todos</Link>}>Pagamentos recentes</SectionTitle>
      {recent.length === 0 ? <Empty text="Nenhum pagamento registrado ainda." /> : (
        <Card className="divide-y divide-ink/10 !p-0">
          {recent.map((p) => (
            <Link key={p.id} to={`/emprestimos/${p.loan_id}`} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-bold">{loanById.get(p.loan_id)?.personName ?? '—'}</p>
                <p className="text-sm text-ink/60">{fmtDate(p.paid_at)}</p>
              </div>
              <b className="text-pine">{fmt(toCents(p.amount))}</b>
            </Link>
          ))}
        </Card>
      )}

      {modal === 'loan' && <LoanForm onClose={() => setModal(null)} />}
      {modal === 'pay' && <PaymentForm onClose={() => setModal(null)} />}
    </>
  )
}
