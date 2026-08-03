-- Registrar un movimiento en una moneda distinta a la de la cuenta.
--
-- `amount` sigue siendo el monto en la moneda de la CUENTA y no se toca: la vista
-- account_balances lo suma en crudo, así que el saldo depende de que siga siendo
-- homogéneo con la cuenta. Lo que el usuario tecleó se guarda aparte para poder
-- mostrarlo tal cual en el libro (pagué 500 Bs con la cuenta en dólares):
--
--   entry_amount / entry_currency = monto y moneda originales.
--
-- Quedan en null cuando se registró en la moneda de la cuenta —el caso normal—,
-- de modo que las filas existentes no necesitan relleno: null significa "igual
-- que la cuenta". La conversión usa la misma tasa congelada en exchange_rate,
-- así que el histórico sigue sin moverse cuando cambia el dólar (ADR 12).
alter table public.transactions
  add column entry_amount   numeric(14, 2) check (entry_amount > 0),
  add column entry_currency char(3);

-- Los dos van juntos o no va ninguno: un monto sin moneda no se puede interpretar.
alter table public.transactions
  add constraint transactions_entry_pair
    check ((entry_amount is null) = (entry_currency is null));
