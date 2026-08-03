-- Pagar una deuda desde el libro de movimientos.
--
-- Hasta ahora un abono (debt_payments) y el gasto que lo pagó eran cosas sueltas:
-- registrar el abono no movía ningún saldo, y el gasto no sabía a qué deuda iba.
-- Esta columna los une: el movimiento es el dinero que se movió y el abono es su
-- efecto sobre la deuda.
--
--   · unique  -> un movimiento salda como mucho una deuda.
--   · cascade -> borrar el movimiento borra su abono. La deuda se vuelve a marcar
--                (o desmarcar) como saldada desde la acción que borra, porque el
--                cascade no puede recalcular is_settled.
--   · null    -> abono suelto, escrito a mano desde la pantalla de deudas. Sigue
--                siendo válido, así que las filas existentes no necesitan relleno.
alter table public.debt_payments
  add column transaction_id uuid unique references public.transactions (id) on delete cascade;

comment on column public.debt_payments.transaction_id is
  'Movimiento que originó el abono. Null = abono suelto registrado en /debts.';
