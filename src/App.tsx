import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase'
import { useAuth } from './lib/auth'
import { DataProvider } from './lib/data'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Loans from './pages/Loans'
import LoanDetail from './pages/LoanDetail'
import Due from './pages/Due'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const { session, loading } = useAuth()

  if (!configured)
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-extrabold">Falta configurar o Supabase</h1>
        <p className="mt-3 text-[15px] leading-relaxed">
          Crie o arquivo <code className="rounded bg-ink/10 px-1">.env</code> com <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (veja o README). Na Vercel, cadastre as mesmas duas variáveis em
          Settings → Environment Variables e faça um novo deploy.
        </p>
      </div>
    )
  if (loading) return <Spinner />
  if (!session) return <Login />

  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pessoas" element={<People />} />
          <Route path="pessoas/:id" element={<PersonDetail />} />
          <Route path="emprestimos" element={<Loans />} />
          <Route path="emprestimos/:id" element={<LoanDetail />} />
          <Route path="vencimentos" element={<Due />} />
          <Route path="pagamentos" element={<Payments />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="config" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}
