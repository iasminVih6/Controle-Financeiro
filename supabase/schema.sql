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


-- ===== v2: parcelamento + pagamento só de juros =====

-- 1) Tipo do pagamento: 'normal' (abate o saldo) ou 'juros' (só juros, saldo continua).
--    Todos os pagamentos já cadastrados viram 'normal' automaticamente.
alter table public.payments
  add column if not exists kind text not null default 'normal'
  constraint payments_kind_check check (kind in ('normal', 'juros'));

-- 2) Parcelas dos empréstimos parcelados (empréstimos antigos continuam sem parcelas).
create table if not exists public.installments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loan_id    uuid not null references public.loans(id) on delete cascade,
  number     int  not null check (number > 0),
  amount     numeric(12,2) not null check (amount > 0),
  due_date   date not null,
  created_at timestamptz not null default now(),
  unique (loan_id, number)
);
create index if not exists installments_loan_idx on public.installments(loan_id);
create index if not exists installments_user_idx on public.installments(user_id);

alter table public.installments enable row level security;
drop policy if exists "installments: dono" on public.installments;
create policy "installments: dono" on public.installments
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.installments from anon;
grant select, insert, update, delete on public.installments to authenticated;

-- 3) Regras de pagamento atualizadas.
--    normal: soma dos pagamentos normais não pode passar do total.
--    juros : cada pagamento de juros não pode passar do valor dos juros do empréstimo.
create or replace function public.check_payment_limit() returns trigger
language plpgsql as $$
declare
  v_total numeric(12,2);
  v_int   numeric(12,2);
  v_paid  numeric(12,2);
begin
  select total_amount, interest_amount into v_total, v_int from public.loans where id = new.loan_id;
  if new.kind = 'juros' then
    if new.amount > v_int then
      raise exception 'O pagamento de juros (R$ %) é maior que os juros do empréstimo (R$ %).', new.amount, v_int;
    end if;
    return new;
  end if;
  select coalesce(sum(amount), 0) into v_paid
    from public.payments where loan_id = new.loan_id and kind = 'normal' and id <> new.id;
  if v_paid + new.amount > v_total then
    raise exception 'Pagamento maior que o saldo do empréstimo (saldo: R$ %).', (v_total - v_paid);
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_limit on public.payments;
create trigger trg_payment_limit before insert or update on public.payments
  for each row execute function public.check_payment_limit();

create or replace function public.check_loan_total() returns trigger
language plpgsql as $$
declare v_paid numeric(12,2);
begin
  select coalesce(sum(amount), 0) into v_paid
    from public.payments where loan_id = new.id and kind = 'normal';
  if new.total_amount < v_paid then
    raise exception 'O novo total (R$ %) é menor do que já foi pago (R$ %).', new.total_amount, v_paid;
  end if;
  return new;
end $$;

-- 4) Salvar parcelas de um empréstimo de uma vez (apaga as antigas e grava as novas, tudo ou nada).
--    Confere se a soma das parcelas é igual ao total do empréstimo.
create or replace function public.save_installments(p_loan_id uuid, p_items jsonb) returns void
language plpgsql security invoker as $$
declare v_total numeric(12,2); v_sum numeric(12,2);
begin
  select total_amount into v_total from public.loans where id = p_loan_id;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  delete from public.installments where loan_id = p_loan_id;
  if p_items is null or jsonb_array_length(p_items) = 0 then return; end if;
  insert into public.installments (loan_id, number, amount, due_date)
    select p_loan_id, (i->>'number')::int, (i->>'amount')::numeric, (i->>'due_date')::date
    from jsonb_array_elements(p_items) i;
  select sum(amount) into v_sum from public.installments where loan_id = p_loan_id;
  if v_sum <> v_total then
    raise exception 'A soma das parcelas (R$ %) é diferente do total do empréstimo (R$ %).', v_sum, v_total;
  end if;
end $$;

-- 5) Pagamento só de juros + novo vencimento, numa operação só (tudo ou nada).
create or replace function public.register_interest_payment(
  p_loan_id uuid, p_amount numeric, p_paid_at date, p_notes text, p_new_due date
) returns uuid
language plpgsql security invoker as $$
declare v_loan public.loans; v_id uuid;
begin
  select * into v_loan from public.loans where id = p_loan_id;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  if exists (select 1 from public.installments where loan_id = p_loan_id) then
    raise exception 'Empréstimos parcelados não aceitam pagamento só de juros.';
  end if;
  if p_new_due is not null and p_new_due < v_loan.loan_date then
    raise exception 'O novo vencimento não pode ser antes da data do empréstimo.';
  end if;
  insert into public.payments (loan_id, amount, paid_at, notes, kind)
    values (p_loan_id, p_amount, p_paid_at, p_notes, 'juros') returning id into v_id;
  if p_new_due is not null then
    update public.loans set due_date = p_new_due where id = p_loan_id;
  end if;
  return v_id;
end $$;

grant execute on function public.save_installments(uuid, jsonb) to authenticated;
grant execute on function public.register_interest_payment(uuid, numeric, date, text, date) to authenticated;
