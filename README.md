# Meus Empréstimos — controle financeiro de empréstimos pessoais

Sistema web mobile-first. React + TypeScript + Tailwind CSS no front; Supabase (PostgreSQL + Auth + RLS) no banco. Hospedagem gratuita: Vercel + Supabase.

## Estrutura do projeto

```
supabase/schema.sql      tabelas, regras no banco e segurança (RLS)
src/lib/                 cálculos (calc.ts), dinheiro em centavos (money.ts), datas, CSV, CPF, auth, dados
src/components/          interface (ui.tsx), formulários (forms.tsx), layout com menu inferior
src/pages/               Dashboard, Pessoas, Empréstimos, Vencimentos, Pagamentos, Relatórios, Configurações
vercel.json              rotas do app de página única
```

## 1. Configurar o Supabase (uma vez)

1. Crie uma conta grátis em https://supabase.com e clique em **New project** (escolha uma senha forte para o banco e a região *South America (São Paulo)*).
2. Abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Crie o usuário do seu padrasto: **Authentication → Users → Add user → Create new user**. Informe e-mail e senha e marque *Auto Confirm User*.
4. **Desative o cadastro público** (para só ele entrar): **Authentication → Sign In / Providers → Email** → desligue *Allow new users to sign up* (ou, em *Settings*, *Disable signups*).
5. Pegue as chaves em **Project Settings → API**: copie **Project URL** e a chave **anon / public**. (Nunca use a `service_role` no site.)

## 2. Rodar no computador

Precisa do Node.js 18+.

```bash
cp .env.example .env      # edite e cole a URL e a chave anon
npm install
npm run dev               # abre em http://localhost:5173
```

## 3. Publicar na internet (Vercel, grátis)

1. Suba a pasta para um repositório no GitHub (o `.env` não vai junto: está no `.gitignore`).
2. Em https://vercel.com → **Add New → Project** → importe o repositório. O Vercel reconhece o Vite sozinho.
3. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env`.
4. Clique em **Deploy**. Ao terminar, você recebe um link como `https://seu-app.vercel.app`.
5. No celular do seu padrasto: abra o link → menu do navegador → **Adicionar à tela inicial**. Vira um ícone, como um aplicativo.
6. Em Supabase → **Authentication → URL Configuration**, coloque o link da Vercel em *Site URL*.

## Como os cálculos funcionam

- **Juros simples**, uma única vez: `juros = capital × taxa ÷ 100`; `total = capital + juros`. O banco calcula (colunas geradas), então nunca há conta manual.
- Todo valor é tratado em **centavos inteiros** no app e `numeric(12,2)` no banco: sem erro de arredondamento.
- **Capital x lucro:** cada pagamento recupera **primeiro o capital**; só o que passa disso conta como **juros recebidos (lucro realizado)**. Ex.: R$ 200 a 10% (total R$ 220), pagou R$ 100 → capital recuperado R$ 100, lucro realizado R$ 0, saldo R$ 120. Ao pagar o restante, quita: capital R$ 200 e lucro R$ 20. Para mudar essa regra (ex.: proporcional), altere só `src/lib/calc.ts`.
- **Lucro previsto** = juros que ainda faltam receber. **Capital a receber** = capital ainda não recuperado.
- **Situação** (automática pela data de hoje e pelos pagamentos): Quitado (saldo zero), Atrasado (venceu e tem saldo), Vence hoje, Próximo (até 7 dias), Em dia. "Parcial" aparece quando já houve pagamento e ainda há saldo.
- **Pagamento maior que o saldo:** o app avisa e oferece registrar só o saldo; o banco também recusa (trigger), mesmo se alguém tentasse burlar o app.

## Como os dados ficam salvos e protegidos

- **Salvos:** em PostgreSQL no Supabase, não no navegador. Fechar a aba, trocar de celular ou limpar o cache não perde nada. O site não usa localStorage para dados.
- **Protegidos:** (1) login com e-mail e senha (Supabase Auth); (2) RLS ativo nas três tabelas: cada linha tem `user_id` e só o dono lê ou altera; visitantes sem login não acessam nada; (3) a chave `anon` é pública por desenho: sozinha não abre nenhum dado por causa do RLS; (4) conexão HTTPS.
- **Histórico preservado:** não dá para apagar pessoa que tem empréstimos, nem empréstimo que tem pagamentos (restrição no banco). Toda exclusão pede confirmação.
- **Backup:** em Configurações há o backup completo (.json) e CSVs (Excel). O plano grátis do Supabase pausa projetos sem uso por 7 dias; entrar no sistema ao menos uma vez por semana evita isso (ou assine o plano Pro, que tem backups diários automáticos).

## Limites desta versão

- Um único usuário (o dono). Para mais usuários, crie-os no Supabase: cada um vê só os próprios dados.
- Carrega até 5.000 pessoas/empréstimos e 10.000 pagamentos por vez, mais que suficiente para uso pessoal.
