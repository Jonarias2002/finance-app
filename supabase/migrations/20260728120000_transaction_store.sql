-- =============================================================================
-- transactions.store_id — en qué tienda se hizo el gasto
-- Opcional. `on delete set null` como en price_records: borrar una tienda no
-- puede llevarse por delante el historial de gastos.
-- =============================================================================

alter table public.transactions
  add column store_id uuid references public.stores (id) on delete set null;

-- Solo un gasto ocurre en una tienda: un ingreso o una transferencia con tienda
-- sería un dato sin sentido, y la regla vive aquí para que no dependa de que el
-- formulario la respete.
alter table public.transactions
  add constraint transactions_store_only_expense
  check (store_id is null or type = 'expense');

-- Consulta natural: "cuánto he gastado en esta tienda", en orden cronológico.
-- Parcial a propósito: por el check de arriba, ingresos y transferencias llevan
-- store_id nulo, y son la mayoría de las filas — indexarlas sería peso muerto.
create index transactions_store_idx on public.transactions (store_id, occurred_at desc)
  where store_id is not null;
