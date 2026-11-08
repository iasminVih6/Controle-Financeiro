import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { errMsg } from './errors'
import { buildViews, LoanView, totals, Totals } from './calc'
import type { Loan, Payment, Person } from './types'

interface DataState {
  people: Person[]
  loans: Loan[]
  payments: Payment[]
  views: LoanView[]
  totals: Totals
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}
const Ctx = createContext<DataState | null>(null)

// Carrega tudo do banco e recalcula os indicadores sempre que algo muda.
// Após qualquer operação, as telas chamam refresh() e o dashboard se atualiza sozinho.
export function DataProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [a, b, c] = await Promise.all([
        supabase.from('people').select('*').order('name').limit(5000),
        supabase.from('loans').select('*').order('due_date').limit(5000),
        supabase.from('payments').select('*').order('paid_at', { ascending: false }).limit(10000),
      ])
      const e = a.error || b.error || c.error
      if (e) throw e
      setPeople((a.data ?? []) as Person[])
      setLoans((b.data ?? []) as Loan[])
      setPayments((c.data ?? []) as Payment[])
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const views = useMemo(() => buildViews(loans, people, payments), [loans, people, payments])
  const tot = useMemo(() => totals(views), [views])

  return (
    <Ctx.Provider value={{ people, loans, payments, views, totals: tot, loading, error, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData(): DataState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData fora do DataProvider')
  return c
}
