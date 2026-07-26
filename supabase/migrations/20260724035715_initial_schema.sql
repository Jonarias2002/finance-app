-- =============================================================================
-- Finance App — initial schema
-- Order follows SETUP.md §8. Every table ends with RLS enabled + policies.
-- Canonical currency: USD, numeric(14,2). Timestamps stored in UTC.
-- =============================================================================

-- 1. Extensions -------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Enumerated types ----------------------------------------------------------
create type public.account_type    as enum ('cash', 'bank', 'digital');
create type public.category_kind   as enum ('income', 'expense');
create type public.txn_type        as enum ('income', 'expense', 'transfer');
create type public.cycle_type      as enum ('calendar', 'fixed_day', 'rolling_30');
create type public.app_role        as enum ('user', 'admin');
create type public.debt_direction  as enum ('i_owe', 'owed_to_me');
create type public.rate_source     as enum ('official', 'parallel');

-- 2. banks — shared catalogue (read-only for users) -------------------------
create table public.banks (
  id            smallint primary key,          -- e.g. 102, 105, 134
  name          text not null,
  mobile_code   char(4) unique,                -- pago móvil: 0102, 0105, 0134...
  is_active     boolean not null default true
);

comment on table public.banks is
  'Venezuelan bank catalogue. BOD no longer exists — merged into BNC.';

insert into public.banks (id, name, mobile_code) values
  (102, 'Banco de Venezuela',            '0102'),
  (104, 'Venezolano de Crédito',         '0104'),
  (105, 'Banco Mercantil',               '0105'),
  (108, 'Banco Provincial (BBVA)',       '0108'),
  (114, 'Bancaribe',                     '0114'),
  (115, 'Banco Exterior',                '0115'),
  (128, 'Banco Caroní',                  '0128'),
  (134, 'Banesco',                       '0134'),
  (137, 'Banco Sofitasa',                '0137'),
  (138, 'Banco Plaza',                   '0138'),
  (146, 'Banco de la Gente Emprendedora','0146'),
  (151, 'Banco Fondo Común (BFC)',       '0151'),
  (156, '100% Banco',                    '0156'),
  (157, 'DelSur Banco',                  '0157'),
  (163, 'Banco del Tesoro',              '0163'),
  (166, 'Banco Agrícola de Venezuela',   '0166'),
  (168, 'Bancrecer',                     '0168'),
  (169, 'Mi Banco',                      '0169'),
  (171, 'Banco Activo',                  '0171'),
  (172, 'Bancamiga',                     '0172'),
  (174, 'Banplus',                       '0174'),
  (175, 'Banco Bicentenario',            '0175'),
  (177, 'Banco de las Fuerzas Armadas (Banfanb)', '0177'),
  (191, 'Banco Nacional de Crédito (BNC)','0191');

alter table public.banks enable row level security;

-- Anyone authenticated may read the catalogue; nobody writes it via the API.
create policy "banks are readable by authenticated users"
  on public.banks for select
  to authenticated
  using (true);

-- 3. profiles — one row per auth user ---------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  base_currency char(3) not null default 'USD',
  timezone      text not null default 'America/Caracas',
  locale        text not null default 'es',
  cycle         public.cycle_type not null default 'calendar',
  cycle_day     smallint not null default 1
                  check (cycle_day between 1 and 28),   -- safe for every month
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 4. user_roles + is_admin() ------------------------------------------------
-- Roles live in their own table so a user can never self-promote by editing
-- their profile row.
create table public.user_roles (
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     public.app_role not null default 'user',
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

-- security definer bypasses RLS on user_roles; STABLE so the planner caches it
-- within a statement. search_path pinned to avoid hijacking.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  );
$$;

-- Users may read their own roles; only admins may read everyone's.
create policy "user_roles: read own or admin"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Only admins can grant/revoke roles.
create policy "user_roles: admin writes"
  on public.user_roles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. accounts ---------------------------------------------------------------
create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  type          public.account_type not null,
  currency      char(3) not null default 'USD',
  bank_id       smallint references public.banks (id),
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index accounts_user_idx on public.accounts (user_id) where not is_archived;

alter table public.accounts enable row level security;

create policy "accounts: owner all"
  on public.accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 6. categories — self-referencing tree -------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  kind        public.category_kind not null,
  parent_id   uuid references public.categories (id) on delete set null,
  is_system   boolean not null default false,        -- seeded defaults
  created_at  timestamptz not null default now()
);

create index categories_user_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "categories: owner all"
  on public.categories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 7. exchange_rates — one row per (day, source) -----------------------------
-- Global table (not per-user): the market rate is the same for everybody.
create table public.exchange_rates (
  rate_date   date not null,
  source      public.rate_source not null,
  -- Bs per 1 USD.
  rate        numeric(18,6) not null check (rate > 0),
  fetched_at  timestamptz not null default now(),
  primary key (rate_date, source)
);

alter table public.exchange_rates enable row level security;

create policy "exchange_rates: readable by authenticated"
  on public.exchange_rates for select to authenticated
  using (true);
-- Writes happen only from the sync route handler using the service_role key,
-- which bypasses RLS. No write policy for normal users on purpose.

-- 8. transactions — the single ledger ---------------------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  account_id     uuid not null references public.accounts (id) on delete restrict,
  category_id    uuid references public.categories (id) on delete set null,
  type           public.txn_type not null,
  -- Amount in the account's own currency, always positive.
  amount         numeric(14,2) not null check (amount > 0),
  currency       char(3) not null default 'USD',
  -- Rate used at the moment of the transaction (Bs per USD). Frozen forever:
  -- history must not shift when the dollar moves (ADR 12).
  exchange_rate  numeric(18,6) not null default 1 check (exchange_rate > 0),
  -- Canonical value in USD, derived and stored.
  amount_usd     numeric(14,2) not null check (amount_usd >= 0),
  -- For transfers (incl. goal contributions): the counterpart account.
  transfer_account_id uuid references public.accounts (id) on delete restrict,
  description    text not null check (length(trim(description)) > 0),
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  -- Gasto fijo: una fila con is_template=true es una PLANTILLA que se repite cada
  -- mes en fixed_day. Las plantillas NUNCA cuentan como dinero movido: se excluyen
  -- del saldo y de toda agregación. is_fixed marca la fila como parte del sistema
  -- de gasto fijo; template_id apunta a la plantilla que originó un movimiento real
  -- (vía "registrar ahora"), y queda en null si la plantilla se elimina.
  is_fixed       boolean not null default false,
  fixed_day      smallint check (fixed_day between 1 and 31),
  is_template    boolean not null default false,
  template_id    uuid references public.transactions (id) on delete set null,
  check (type <> 'transfer' or transfer_account_id is not null),
  check (transfer_account_id is null or transfer_account_id <> account_id),
  -- Un gasto fijo debe traer su día del mes; una plantilla es siempre un gasto fijo.
  check (is_fixed = false or fixed_day is not null),
  check (is_template = false or is_fixed = true)
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx
  on public.transactions (account_id);
-- Listar rápido las plantillas de gasto fijo de un usuario.
create index transactions_template_idx
  on public.transactions (user_id) where is_template;

alter table public.transactions enable row level security;

create policy "transactions: owner all"
  on public.transactions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 9. Los "gastos fijos" NO son una tabla aparte: son plantillas dentro de
--    transactions (is_template=true). Ver las columnas is_fixed / fixed_day /
--    is_template / template_id en la sección 8.

-- 10. debts + debt_payments -------------------------------------------------
create table public.debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  direction     public.debt_direction not null,   -- i_owe / owed_to_me
  counterparty  text not null,
  principal     numeric(14,2) not null check (principal > 0),
  currency      char(3) not null default 'USD',
  description   text,
  due_date      date,
  is_settled    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index debts_user_idx on public.debts (user_id) where not is_settled;

alter table public.debts enable row level security;

create policy "debts: owner all"
  on public.debts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.debt_payments (
  id          uuid primary key default gen_random_uuid(),
  debt_id     uuid not null references public.debts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  paid_at     timestamptz not null default now(),
  note        text
);

create index debt_payments_debt_idx on public.debt_payments (debt_id);

alter table public.debt_payments enable row level security;

create policy "debt_payments: owner all"
  on public.debt_payments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 11. savings_goals + goal_contributions ------------------------------------
-- A goal reserves money inside an account. The reservation reduces the
-- account's available balance but not its total (ADR 15/16).
create table public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete restrict,
  name          text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  currency      char(3) not null default 'USD',
  target_date   date,
  is_achieved   boolean not null default false,
  created_at    timestamptz not null default now()
);

create index savings_goals_user_idx on public.savings_goals (user_id);
create index savings_goals_account_idx on public.savings_goals (account_id);

alter table public.savings_goals enable row level security;

create policy "savings_goals: owner all"
  on public.savings_goals for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.goal_contributions (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.savings_goals (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric(14,2) not null check (amount <> 0),  -- may be negative (withdrawal)
  contributed_at timestamptz not null default now(),
  note        text
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id);

alter table public.goal_contributions enable row level security;

create policy "goal_contributions: owner all"
  on public.goal_contributions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 12. budgets — per category, per cycle -------------------------------------
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  amount_usd   numeric(14,2) not null check (amount_usd > 0),
  period_start date not null,
  created_at   timestamptz not null default now(),
  unique (user_id, category_id, period_start)
);

create index budgets_user_idx on public.budgets (user_id);

alter table public.budgets enable row level security;

create policy "budgets: owner all"
  on public.budgets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 13. audit_log -------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

-- Users may read their own audit trail; admins read everything. No client
-- writes: entries are inserted server-side with the service_role key.
create policy "audit_log: read own or admin"
  on public.audit_log for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- 14. get_cycle_bounds(user_id, ref_date) -----------------------------------
-- Returns the [start, end) half-open bounds of the monthly cycle that
-- contains ref_date, honouring the user's cycle setting. One central place
-- so every report agrees on where a month begins.
create or replace function public.get_cycle_bounds(
  p_user_id uuid,
  p_ref_date date default (now() at time zone 'America/Caracas')::date
)
returns table (cycle_start date, cycle_end date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cycle public.cycle_type;
  v_day   smallint;
  v_start date;
begin
  select cycle, cycle_day into v_cycle, v_day
  from public.profiles where id = p_user_id;

  if v_cycle is null then
    v_cycle := 'calendar';
    v_day := 1;
  end if;

  if v_cycle = 'calendar' then
    v_start := date_trunc('month', p_ref_date)::date;
    return query select v_start, (v_start + interval '1 month')::date;

  elsif v_cycle = 'fixed_day' then
    -- Cycle runs from day v_day of a month to day v_day of the next.
    v_start := make_date(
      extract(year from p_ref_date)::int,
      extract(month from p_ref_date)::int,
      least(v_day, 28)
    );
    if p_ref_date < v_start then
      v_start := (v_start - interval '1 month')::date;
    end if;
    return query select v_start, (v_start + interval '1 month')::date;

  else -- rolling_30
    return query select (p_ref_date - interval '29 days')::date,
                        (p_ref_date + interval '1 day')::date;
  end if;
end;
$$;

-- 15. account_balances view — total / reserved / available ------------------
-- total    = signed sum of the account's transactions (account currency)
-- reserved = money locked by active savings goals on that account
-- available = total - reserved
create or replace view public.account_balances
with (security_invoker = true) as
with txn as (
  select
    a.id as account_id,
    coalesce(sum(
      case
        when t.type = 'income'   then t.amount
        when t.type = 'expense'  then -t.amount
        when t.type = 'transfer' then -t.amount   -- money leaving this account
        else 0
      end
    ), 0)
    + coalesce((
        select sum(t2.amount)
        from public.transactions t2
        where t2.transfer_account_id = a.id and t2.type = 'transfer'
          and not t2.is_template
      ), 0) as total_balance                       -- money arriving via transfer
  from public.accounts a
  -- Las plantillas de gasto fijo nunca cuentan como dinero movido.
  left join public.transactions t on t.account_id = a.id and not t.is_template
  group by a.id
),
reserved as (
  select g.account_id, coalesce(sum(
    (select coalesce(sum(gc.amount), 0)
     from public.goal_contributions gc
     where gc.goal_id = g.id)
  ), 0) as reserved_balance
  from public.savings_goals g
  where not g.is_achieved
  group by g.account_id
)
select
  a.id                                   as account_id,
  a.user_id,
  a.currency,
  coalesce(txn.total_balance, 0)         as total_balance,
  coalesce(reserved.reserved_balance, 0) as reserved_balance,
  coalesce(txn.total_balance, 0)
    - coalesce(reserved.reserved_balance, 0) as available_balance
from public.accounts a
left join txn      on txn.account_id = a.id
left join reserved on reserved.account_id = a.id;

-- 16. RLS is enabled on every base table above. The view uses
--     security_invoker so it runs under the caller's own policies.

-- 17. on_auth_user_created — provision a new user ---------------------------
-- Runs as the definer because it writes rows the brand-new user has no
-- session to write yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  -- Default categories (is_system = true).
  insert into public.categories (user_id, name, kind, is_system) values
    (new.id, 'Salario',        'income',  true),
    (new.id, 'Otros ingresos', 'income',  true),
    (new.id, 'Comida',         'expense', true),
    (new.id, 'Transporte',     'expense', true),
    (new.id, 'Servicios',      'expense', true),
    (new.id, 'Salud',          'expense', true),
    (new.id, 'Ocio',           'expense', true),
    (new.id, 'Otros gastos',   'expense', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
