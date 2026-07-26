-- =============================================================================
-- Módulo v2 — Carrito de compras con presupuesto (SETUP.md §16)
-- Cuatro tablas nuevas + una columna en transactions. Convenciones del proyecto:
-- numeric(14,2) para dinero, timestamptz UTC, user_id denormalizado + RLS owner.
-- =============================================================================

create type public.shopping_status as enum ('draft', 'shopping', 'completed', 'cancelled');
create type public.product_unit    as enum ('unit', 'kg', 'g', 'liter', 'ml', 'pack');

-- 1. stores — supermercados del usuario -------------------------------------
create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index stores_user_idx on public.stores (user_id);
alter table public.stores enable row level security;
create policy "stores: owner all" on public.stores for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 2. products — catálogo personal -------------------------------------------
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null,
  unit                public.product_unit not null default 'unit',
  default_category_id uuid references public.categories (id) on delete set null,
  is_staple           boolean not null default false,
  typical_days        smallint check (typical_days is null or typical_days > 0),
  created_at          timestamptz not null default now()
);
create index products_user_idx on public.products (user_id);
alter table public.products enable row level security;
create policy "products: owner all" on public.products for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 3. price_records — historial de precios (el corazón del módulo) ------------
create table public.price_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete cascade,
  store_id          uuid references public.stores (id) on delete set null,
  unit_price_usd    numeric(14,2) not null check (unit_price_usd >= 0),
  original_amount   numeric(14,2),
  original_currency char(3) not null default 'USD',
  exchange_rate     numeric(18,6) not null default 1 check (exchange_rate > 0),
  recorded_at       timestamptz not null default now(),
  note              text
);
create index price_records_product_idx on public.price_records (product_id, recorded_at desc);
alter table public.price_records enable row level security;
create policy "price_records: owner all" on public.price_records for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 4. shopping_lists — carritos ----------------------------------------------
create table public.shopping_lists (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  store_id       uuid references public.stores (id) on delete set null,
  budget_usd     numeric(14,2) check (budget_usd is null or budget_usd > 0),
  status         public.shopping_status not null default 'draft',
  transaction_id uuid references public.transactions (id) on delete set null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index shopping_lists_user_idx on public.shopping_lists (user_id, status);
alter table public.shopping_lists enable row level security;
create policy "shopping_lists: owner all" on public.shopping_lists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 5. shopping_list_items — ítems / checklist --------------------------------
create table public.shopping_list_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  list_id             uuid not null references public.shopping_lists (id) on delete cascade,
  product_id          uuid references public.products (id) on delete set null,
  name                text,
  quantity            numeric(12,3) not null default 1 check (quantity > 0),
  unit                public.product_unit not null default 'unit',
  estimated_price_usd numeric(14,2),
  actual_price_usd    numeric(14,2),
  checked             boolean not null default false,
  position            smallint not null default 0,
  created_at          timestamptz not null default now(),
  -- Ítem de catálogo o ad-hoc: al menos uno de product_id / name.
  check (product_id is not null or name is not null)
);
create index shopping_list_items_list_idx on public.shopping_list_items (list_id, position);
alter table public.shopping_list_items enable row level security;
create policy "shopping_list_items: owner all" on public.shopping_list_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 6. transactions.shopping_list_id — enlace al cerrar la compra -------------
alter table public.transactions
  add column shopping_list_id uuid references public.shopping_lists (id) on delete set null;
