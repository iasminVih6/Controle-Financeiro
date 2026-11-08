import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, HandCoins, LayoutDashboard, Settings, Users, Wallet } from 'lucide-react'
import { useData } from '../lib/data'
import { ErrorBox, Spinner } from './ui'

const items = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/pessoas', label: 'Pessoas', icon: Users },
  { to: '/emprestimos', label: 'Empréstimos', icon: HandCoins },
  { to: '/pagamentos', label: 'Pagamentos', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/config', label: 'Config.', icon: Settings },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { loading, error, refresh } = useData()
  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to) || (to === '/emprestimos' && pathname.startsWith('/vencimentos'))

  return (
    <div className="min-h-screen md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-pine p-5 text-white md:flex">
        <p className="mb-8 text-xl font-extrabold">Meus Empréstimos</p>
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 font-semibold ${isActive(to) ? 'bg-white text-pine-dark' : 'text-white/85 hover:bg-white/10'}`}>
              <Icon size={20} /> {label === 'Config.' ? 'Configurações' : label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5 md:pb-10">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={refresh} /> : <Outlet />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} aria-label={label}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive(to) ? 'text-pine' : 'text-ink/50'}`}>
            <Icon size={24} strokeWidth={isActive(to) ? 2.6 : 2} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
