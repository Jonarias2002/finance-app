-- =============================================================================
-- Gasto recurrente como atributo de la CATEGORÍA (de gasto).
-- Una categoría de gasto puede marcarse como recurrente y guardar el día del mes
-- en que se repite. No hay plantillas de movimiento: lo recurrente vive aquí.
-- =============================================================================

alter table public.categories
  add column is_recurring  boolean not null default false,
  add column recurring_day smallint check (recurring_day between 1 and 31);

alter table public.categories
  add constraint categories_recurring_has_day
    check (is_recurring = false or recurring_day is not null),
  add constraint categories_recurring_expense_only
    check (is_recurring = false or kind = 'expense');
