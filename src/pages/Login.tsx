import { FormEvent, useState } from 'react'
import { useAuth } from '../lib/auth'
import { errMsg } from '../lib/errors'
import { Btn, Field, inputCls } from '../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Preencha o e-mail e a senha.')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (x) {
      setError(errMsg(x))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-pine px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-white">Meus Empréstimos</h1>
        <p className="mb-6 mt-1 text-white/80">Entre para ver seu controle financeiro.</p>
        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-5">
          <Field label="E-mail">
            <input className={inputCls} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="rounded-2xl bg-brick-soft p-3 text-sm font-semibold text-brick">{error}</p>}
          <button type="submit" disabled={loading}
            className="min-h-12 w-full rounded-2xl bg-pine text-base font-bold text-white active:bg-pine-dark disabled:opacity-50">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
