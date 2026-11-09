import { useState } from 'react'
import { Download, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { errMsg } from '../lib/errors'
import { exportBackup, exportLoans, exportPayments, exportPeople } from '../lib/exports'
import { Btn, Card, Field, inputCls, PageHeader, SectionTitle, useUI } from '../components/ui'

export default function Settings() {
  const { session, signOut } = useAuth()
  const { people, loans, payments, installments, views, refresh } = useData()
  const { toast, confirm } = useUI()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const changePwd = async () => {
    setErr('')
    if (pwd.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.')
    if (pwd !== pwd2) return setErr('As senhas não são iguais.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setSaving(false)
    if (error) return setErr(errMsg(error))
    setPwd(''); setPwd2('')
    toast('Senha alterada.')
  }

  const logout = async () => {
    const ok = await confirm({ title: 'Sair do sistema?', message: 'Você precisará entrar de novo com e-mail e senha.', confirmLabel: 'Sair' })
    if (ok) await signOut()
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <Card>
        <p className="text-sm text-ink/60">Conta</p>
        <p className="font-bold">{session?.user.email}</p>
      </Card>

      <SectionTitle>Backup e exportação</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-ink/70">Seus dados ficam guardados no banco de dados online. Baixe uma cópia de vez em quando para guardar no celular ou no computador.</p>
        <Btn className="w-full" onClick={() => { exportBackup(people, loans, payments, installments); toast('Backup completo baixado.') }}><Download size={18} /> Backup completo (.json)</Btn>
        <div className="grid grid-cols-3 gap-2">
          <Btn variant="secondary" className="px-2 text-sm" onClick={() => exportPeople(people)}>Pessoas</Btn>
          <Btn variant="secondary" className="px-2 text-sm" onClick={() => exportLoans(views)}>Empréstimos</Btn>
          <Btn variant="secondary" className="px-2 text-sm" onClick={() => exportPayments(views)}>Pagamentos</Btn>
        </div>
        <p className="text-xs text-ink/55">Os arquivos .csv abrem direto no Excel.</p>
      </Card>

      <SectionTitle>Alterar senha</SectionTitle>
      <Card className="space-y-3">
        <Field label="Nova senha"><input type="password" autoComplete="new-password" className={inputCls} value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
        <Field label="Repita a nova senha" error={err}><input type="password" autoComplete="new-password" className={inputCls} value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></Field>
        <Btn className="w-full" loading={saving} onClick={changePwd}>Salvar nova senha</Btn>
      </Card>

      <SectionTitle>Sistema</SectionTitle>
      <Card className="space-y-3">
        <Btn variant="secondary" className="w-full" onClick={() => { void refresh().then(() => toast('Dados atualizados.')) }}>Atualizar dados agora</Btn>
        <Btn variant="danger" className="w-full" onClick={logout}><LogOut size={18} /> Sair</Btn>
      </Card>
    </>
  )
}
