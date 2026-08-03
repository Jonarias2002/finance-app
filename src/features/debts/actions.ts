'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getRateForDate } from '@/features/exchange-rates/get-latest-rate';
import type { Currency } from '@/lib/format';
import { debtSchema, paymentSchema, type ActionState } from './schemas';
import { syncSettled } from './sync-settled';

const round2 = (n: number) => Math.round(n * 100) / 100;

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors };
}

export async function saveDebt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawDescription = formData.get('description');
  const rawDueDate = formData.get('dueDate');
  const parsed = debtSchema.safeParse({
    direction: formData.get('direction'),
    counterparty: formData.get('counterparty'),
    principal: Number(formData.get('principal')),
    currency: formData.get('currency'),
    description: rawDescription ? String(rawDescription) : null,
    dueDate: rawDueDate ? String(rawDueDate) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { direction, counterparty, principal, currency, description, dueDate } = parsed.data;
  const values = {
    direction,
    counterparty: counterparty.trim(),
    principal: round2(principal),
    currency,
    description: description?.trim() || null,
    due_date: dueDate,
  };

  const id = (formData.get('id') as string) || null;

  if (id) {
    const { error } = await supabase
      .from('debts')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
    await syncSettled(supabase, user.id, id);
  } else {
    const { error } = await supabase.from('debts').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/debts');
  return { ok: true };
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('debts').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/debts');
}

export async function setDebtSettled(id: string, settled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('debts').update({ is_settled: settled }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/debts');
}

/**
 * Registra un abono. Un abono es dinero moviéndose, así que crea también el
 * movimiento que lo respalda —gasto si es una deuda mía, ingreso si me deben— y
 * los deja enlazados. Así el abono aparece en el libro y afecta al saldo de la
 * cuenta, en vez de vivir en un rincón aparte.
 *
 * El monto se teclea en la moneda de la DEUDA y se convierte a la de la cuenta
 * con la tasa del BCV de esa fecha. Para elegir otra tasa (paralelo, manual) el
 * camino es registrar el movimiento desde el libro y marcar allí la deuda.
 */
export async function addPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawNote = formData.get('note');
  const parsed = paymentSchema.safeParse({
    debtId: formData.get('debtId'),
    accountId: formData.get('accountId'),
    amount: Number(formData.get('amount')),
    note: rawNote ? String(rawNote) : null,
    paidAt: formData.get('paidAt'),
    settle: formData.get('settle') === 'on',
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { debtId, accountId, amount, note, paidAt, settle } = parsed.data;

  // Deuda y cuenta deben ser del usuario (RLS también lo cubre, pero fallamos claro).
  const [{ data: debt }, { data: account }] = await Promise.all([
    supabase
      .from('debts')
      .select('id, direction, currency, counterparty')
      .eq('id', debtId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('accounts')
      .select('id, currency')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (!debt) return { error: 'generic' };
  if (!account) return { fieldErrors: { accountId: 'required' } };

  const debtCurrency = debt.currency as Currency;
  const accountCurrency = account.currency as Currency;

  // Solo hace falta tasa si hay bolívares por algún lado.
  let rate = 1;
  if (debtCurrency === 'VES' || accountCurrency === 'VES') {
    const point = await getRateForDate(supabase, paidAt);
    if (!point) return { error: 'noRate' };
    rate = point.rate;
  }

  const amountUsd = round2(debtCurrency === 'VES' ? amount / rate : amount);
  const accountAmount = round2(accountCurrency === 'VES' ? amountUsd * rate : amountUsd);
  const occurredAt = `${paidAt}T12:00:00-04:00`; // mediodía Caracas (ADR 13)
  const converted = debtCurrency !== accountCurrency;

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: accountId,
      category_id: null,
      store_id: null,
      // Lo que debo sale de la cuenta; lo que me deben entra.
      type: debt.direction === 'i_owe' ? 'expense' : 'income',
      amount: accountAmount,
      currency: accountCurrency,
      entry_amount: converted ? round2(amount) : null,
      entry_currency: converted ? debtCurrency : null,
      exchange_rate: rate,
      amount_usd: amountUsd,
      description: note?.trim() || `Abono a ${debt.counterparty as string}`,
      occurred_at: occurredAt,
    })
    .select('id')
    .single();
  if (txnError || !txn) return { error: 'generic' };

  const { error } = await supabase.from('debt_payments').insert({
    debt_id: debtId,
    user_id: user.id,
    amount: round2(amount),
    note: note?.trim() || null,
    paid_at: occurredAt,
    transaction_id: txn.id,
  });
  if (error) {
    // Sin abono, el movimiento sobra: no dejamos el gasto suelto.
    await supabase.from('transactions').delete().eq('id', txn.id).eq('user_id', user.id);
    return { error: 'generic' };
  }

  if (settle) {
    await supabase
      .from('debts')
      .update({ is_settled: true })
      .eq('id', debtId)
      .eq('user_id', user.id);
  } else {
    await syncSettled(supabase, user.id, debtId);
  }

  revalidatePath('/debts');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/manage');
  revalidatePath('/');
  return { ok: true };
}

export async function deletePayment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: payment } = await supabase
    .from('debt_payments')
    .select('debt_id, transaction_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!payment) return;

  if (payment.transaction_id) {
    // El abono nació de un movimiento: se borra el movimiento y el abono se va con
    // él por el cascade. Borrar solo el abono dejaría el gasto sin su contrapartida.
    await supabase
      .from('transactions')
      .delete()
      .eq('id', payment.transaction_id)
      .eq('user_id', user.id);
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/manage');
    revalidatePath('/');
  } else {
    await supabase.from('debt_payments').delete().eq('id', id).eq('user_id', user.id);
  }

  await syncSettled(supabase, user.id, payment.debt_id as string);
  revalidatePath('/debts');
}
