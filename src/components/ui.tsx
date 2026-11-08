import { ButtonHTMLAttributes, createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { STATUS_LABEL, Status } from '../lib/calc'

/* ---------- Toast + Confirmação ---------- */
interface ConfirmOpts { title: string; message: string; confirmLabel?: string; danger?: boolean }
interface UICtx {
  toast: (msg: string, type?: 'ok' | 'erro') => void
  confirm: (o: ConfirmOpts) => Promise<boolean>
}
const Ctx = createContext<UICtx | null>(null)
export const useUI = (): UICtx => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI fora do UIProvider')
  return c
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toastState, setToast] = useState<{ msg: string; type: 'ok' | 'erro' } | null>(null)
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const timer = useRef<number>()

  const toast = useCallback((msg: string, type: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, type })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), type === 'erro' ? 6000 : 3000)
  }, [])
  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })),
    [],
  )
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null) }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      {toastState && (
        <div role="status" className="fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
          <div className={`flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${toastState.type === 'ok' ? 'bg-pine text-white' : 'bg-brick text-white'}`}>
            {toastState.type === 'ok' ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <AlertTriangle size={20} className="mt-0.5 shrink-0" />}
            <span>{toastState.msg}</span>
          </div>
        </div>
      )}
      {dlg && (
        <Modal title={dlg.title} onClose={() => close(false)}>
          <p className="text-[15px] leading-relaxed text-ink/80">{dlg.message}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn variant="secondary" onClick={() => close(false)}>Cancelar</Btn>
            <Btn variant={dlg.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dlg.confirmLabel ?? 'Confirmar'}</Btn>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  )
}

/* ---------- Botões e campos ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-pine text-white active:bg-pine-dark',
  secondary: 'bg-white text-ink border border-ink/15 active:bg-ink/5',
  danger: 'bg-brick text-white active:opacity-90',
  ghost: 'bg-transparent text-pine active:bg-pine-soft',
}
export function Btn({ variant = 'primary', loading, className = '', children, disabled, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      disabled={disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  )
}

export const inputCls =
  'w-full min-h-12 rounded-2xl border border-ink/20 bg-white px-4 text-ink placeholder:text-ink/40 focus:border-pine'

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink/80">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink/55">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-semibold text-brick">{error}</span>}
    </label>
  )
}

/* ---------- Estrutura ---------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(20,33,31,0.08)] ${className}`}>{children}</div>
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {action}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-lg font-bold">{children}</h2>
      {right}
    </div>
  )
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/15 px-4 py-8 text-center">
      <p className="text-[15px] text-ink/60">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink/60">
      <Loader2 className="animate-spin" size={22} /> {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-3xl bg-brick-soft p-5 text-brick">
      <p className="font-bold">Não foi possível carregar os dados</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && <Btn variant="danger" className="mt-4" onClick={onRetry}>Tentar de novo</Btn>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 md:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-ink/10">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- Status ---------- */
const badge: Record<Status, string> = {
  quitado: 'bg-pine-soft text-pine-dark',
  atrasado: 'bg-brick-soft text-brick',
  hoje: 'bg-gold-soft text-gold',
  proximo: 'bg-sky-100 text-sky-800',
  emdia: 'bg-ink/10 text-ink/70',
}
export function StatusBadge({ status, partial }: { status: Status; partial?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[status]}`}>{STATUS_LABEL[status]}</span>
      {partial && status !== 'quitado' && (
        <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">Parcial</span>
      )}
    </span>
  )
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${value === t.id ? 'bg-ink text-white' : 'bg-white text-ink/70'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
