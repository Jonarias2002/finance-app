-- =============================================================================
-- Estado del ciclo vigente de cada gasto fijo (plantilla), DERIVADO en lectura.
--
-- El ciclo lo define la función del usuario get_cycle_bounds(user_id) según su
-- configuración (calendar / fixed_day / rolling_30). Dentro de ese ciclo:
--   · paid     -> ya existe un movimiento real de la plantilla en [start, end)
--   · overdue  -> el día del mes de la plantilla ya pasó y no se ha registrado
--   · pending  -> aún no llega ese día (o es hoy) y no se ha registrado
--
-- Nada se guarda: la vista calcula el estado al consultarse.
-- =============================================================================

create or replace view public.fixed_expense_status
with (security_invoker = true) as
select
  t.id          as template_id,
  b.cycle_start,
  b.cycle_end,
  due.due_date,
  case
    when exists (
      select 1
      from public.transactions p
      where p.template_id = t.id
        and p.occurred_at >= b.cycle_start
        and p.occurred_at <  b.cycle_end
    ) then 'paid'
    when (now() at time zone 'America/Caracas')::date > due.due_date then 'overdue'
    else 'pending'
  end as status
from public.transactions t
cross join lateral public.get_cycle_bounds(t.user_id) b
-- Fecha de cobro dentro del ciclo: el primer día cuyo número de día coincide con
-- fixed_day (recortado a la longitud del mes), recorriendo los días del ciclo.
cross join lateral (
  select gs::date as due_date
  from generate_series(b.cycle_start, b.cycle_end - 1, interval '1 day') gs
  where extract(day from gs)::int = least(
    t.fixed_day,
    extract(day from (date_trunc('month', gs) + interval '1 month' - interval '1 day'))::int
  )
  order by gs
  limit 1
) due
where t.is_template = true;
