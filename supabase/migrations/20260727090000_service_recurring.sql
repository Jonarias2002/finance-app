-- =============================================================================
-- La recurrencia pasa de la CATEGORÍA al PRODUCTO.
-- Un servicio recurrente (ej. CANTV, Luz) es un producto con su día de pago del
-- mes; así cada servicio bajo la categoría "Servicios" tiene su propia fecha.
-- Los `if exists` hacen esta migración segura aunque la de categoría no se haya
-- aplicado.
-- =============================================================================

-- 1. Quitar la recurrencia de categorías (modelado provisional anterior).
alter table public.categories
  drop constraint if exists categories_recurring_has_day,
  drop constraint if exists categories_recurring_expense_only;

alter table public.categories
  drop column if exists is_recurring,
  drop column if exists recurring_day;

-- 2. La recurrencia vive ahora en el producto: día del mes en que se paga.
alter table public.products
  add column if not exists is_recurring  boolean not null default false,
  add column if not exists recurring_day smallint check (recurring_day between 1 and 31);

alter table public.products
  add constraint products_recurring_has_day
    check (is_recurring = false or recurring_day is not null);
