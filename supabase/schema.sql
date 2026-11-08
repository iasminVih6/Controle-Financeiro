-- =====================================================================
-- Gestor de Empréstimos — esquema do banco (Supabase / PostgreSQL)
-- Cole este script inteiro em: Supabase > SQL Editor > New query > Run
-- É seguro rodar mais de uma vez.
-- =====================================================================

-- ---------- TABELAS ----------
create table if not exists public.people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) >= 2),
  phone      text,
  cpf        text,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- RESTRICT: não deixa apagar uma pessoa que tem empréstimos (preserva histórico)
  person_id       uuid not null references public.people(id) on delete restrict,
  principal       numeric(12,2) not null check (principal > 0),
  interest_rate   numeric(7,3)  not null check (interest_rate >= 0),
  -- Juros simples, aplicados uma única vez. Calculados pelo banco (sem erro de arredondamento).
  interest_amount numeric(12,2) generated always as (round(principal * interest_rate / 100, 2)) stored,
  total_amount    numeric(12,2) generated always as (principal + round(principal * interest_rate / 100, 2)) stored,
  loan_date       date not null,
  due_date        date not null,
  notes           text,
  created_at      timestamptz not null default now(),
  check (due_date >= loan_date)
);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- RESTRICT: não deixa apagar um empréstimo que já tem pagamentos
  loan_id    uuid not null references public.loans(id) on delete restrict,
  amount     numeric(12,2) not null check (amount > 0),
  paid_at    date not null,
  notes      text,
  created_at timestamptz not null default now()
);

create index if not exists loans_person_idx  on public.loans(person_id);
create index if not exists loans_user_idx    on public.loans(user_id);
create index if not exists payments_loan_idx on public.payments(loan_id);
create index if not exists payments_user_idx on public.payments(user_id);

-- ---------- REGRAS DE NEGÓCIO NO BANCO ----------
-- Impede que a soma dos pagamentos passe do total do empréstimo.
create or replace function public.check_payment_limit() returns trigger
language plpgsql as $$
declare
  v_total numeric(12,2);
  v_paid  numeric(12,2);
begin
  select total_amount into v_total from public.loans where id = new.loan_id;
  select coalesce(sum(amount), 0) into v_paid
    from public.payments where loan_id = new.loan_id and id <> new.id;
  if v_paid + new.amount > v_total then
    raise exception 'Pagamento maior que o saldo do empréstimo (saldo: R$ %).', (v_total - v_paid);
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_limit on public.payments;
create trigger trg_payment_limit before insert or update on public.payments
  for each row execute function public.check_payment_limit();

-- Impede reduzir o total do empréstimo abaixo do que já foi pago.
create or replace function public.check_loan_total() returns trigger
language plpgsql as $$
declare v_paid numeric(12,2);
begin
  select coalesce(sum(amount), 0) into v_paid from public.payments where loan_id = new.id;
  if new.total_amount < v_paid then
    raise exception 'O novo total (R$ %) é menor do que já foi pago (R$ %).', new.total_amount, v_paid;
  end if;
  return new;
end $$;

drop trigger if exists trg_loan_total on public.loans;
create trigger trg_loan_total before update on public.loans
  for each row execute function public.check_loan_total();

-- ---------- SEGURANÇA (RLS) ----------
-- Cada linha só pode ser vista/alterada por quem a criou (auth.uid()).
alter table public.people   enable row level security;
alter table public.loans    enable row level security;
alter table public.payments enable row level security;

drop policy if exists "people: dono"   on public.people;
drop policy if exists "loans: dono"    on public.loans;
drop policy if exists "payments: dono" on public.payments;

create policy "people: dono" on public.people
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "loans: dono" on public.loans
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "payments: dono" on public.payments
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Visitantes sem login não têm nenhum acesso.
revoke all on public.people, public.loans, public.payments from anon;
grant select, insert, update, delete on public.people, public.loans, public.payments to authenticated;
