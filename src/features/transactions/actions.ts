'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getRateForDate } from '@/features/exchange-rates/get-latest-rate';
import { transactionSchema, transferSchema, type ActionState } from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tasa manual que llega del formulario (Bs por 1 USD); vacío o inválido -> null. */
function manualRateFrom(formData: FormData): number | null {
  const n = Number(formData.get('exchangeRate'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return { fieldErrors };
}

/**
 * Tasa a congelar en el movimiento (Bs por 1 USD). Prioridad:
 * 1) tasa manual que envía el formulario; 2) tasa histórica de la fecha
 * `occurredAt` (la del día o la más reciente anterior); 3) al editar, la tasa ya
 * congelada. USD siempre es 1. Devuelve 'noRate' si no hay de dónde tomarla.
 */
async function rateFor(
  supabase: SupabaseClient,
  userId: string,
  id: string | null,
  currency: 'USD' | 'VES',
  occurredAt: string,
  manualRate: number | null,
): Promise<number | 'noRate'> {
  if (currency !== 'VES') return 1;
  if (manualRate) return manualRate;

  const point = await getRateForDate(supabase, occurredAt);
  if (point) return point.rate;

  if (id) {
    const { data } = await supabase
      .from('transactions')
      .select('exchange_rate')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return Number(data.exchange_rate);
  }
  return 'noRate';
}

/**
 * Crea o actualiza un movimiento. La moneda la define la cuenta (integridad del
 * saldo). La tasa sigue la fecha del movimiento por defecto, así un gasto de ayer
 * registrado hoy se convierte con la tasa de ayer; el formulario puede además
 * enviar una tasa manual. El monto en USD se deriva en el servidor.
 */
export async function saveTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const id = (formData.get('id') as string) || null;
  if (formData.get('type') === 'transfer') {
    return saveTransfer(supabase, user.id, id, formData);
  }

  const rawCategory = formData.get('categoryId');
  const parsed = transactionSchema.safeParse({
    type: formData.get('type'),
    accountId: formData.get('accountId'),
    categoryId: rawCategory ? String(rawCategory) : null,
    amount: Number(formData.get('amount')),
    description: formData.get('description'),
    occurredAt: formData.get('occurredAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { type, accountId, categoryId, amount, description, occurredAt } = parsed.data;

  // La cuenta define la moneda del movimiento (integridad del saldo).
  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return { fieldErrors: { accountId: 'required' } };
  const currency = account.currency as 'USD' | 'VES';

  const rate = await rateFor(supabase, user.id, id, currency, occurredAt, manualRateFrom(formData));
  if (rate === 'noRate') return { error: 'noRate' };

  const amountUsd = currency === 'VES' ? round2(amount / rate) : round2(amount);

  const values = {
    type,
    account_id: accountId,
    category_id: categoryId,
    transfer_account_id: null,
    amount: round2(amount),
    currency,
    exchange_rate: rate,
    amount_usd: amountUsd,
    description: description.trim(),
    occurred_at: `${occurredAt}T12:00:00-04:00`, // mediodía Caracas (ADR 13)
  };

  if (id) {
    const { error } = await supabase
      .from('transactions')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('transactions').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/manage');
  revalidatePath('/');
  return { ok: true };
}

/**
 * Transferencia entre dos cuentas propias de la misma moneda: un solo asiento
 * `transfer` con `transfer_account_id`. La vista account_balances resta del
 * origen y suma al destino. Cross-moneda queda fuera (la vista suma el monto en
 * la moneda del origen; convertir requeriría un segundo monto).
 */
async function saveTransfer(
  supabase: SupabaseClient,
  userId: string,
  id: string | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transferSchema.safeParse({
    accountId: formData.get('accountId'),
    transferAccountId: formData.get('transferAccountId'),
    amount: Number(formData.get('amount')),
    description: formData.get('description'),
    occurredAt: formData.get('occurredAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const { accountId, transferAccountId, amount, description, occurredAt } = parsed.data;

  const { data: accts } = await supabase
    .from('accounts')
    .select('id, currency')
    .in('id', [accountId, transferAccountId])
    .eq('user_id', userId);
  const source = (accts ?? []).find((a) => a.id === accountId);
  const dest = (accts ?? []).find((a) => a.id === transferAccountId);
  if (!source) return { fieldErrors: { accountId: 'required' } };
  if (!dest) return { fieldErrors: { transferAccountId: 'required' } };
  if (source.currency !== dest.currency) return { error: 'currencyMismatch' };

  const currency = source.currency as 'USD' | 'VES';
  const rate = await rateFor(supabase, userId, id, currency, occurredAt, manualRateFrom(formData));
  if (rate === 'noRate') return { error: 'noRate' };
  const amountUsd = currency === 'VES' ? round2(amount / rate) : round2(amount);

  const values = {
    type: 'transfer' as const,
    account_id: accountId,
    transfer_account_id: transferAccountId,
    category_id: null,
    amount: round2(amount),
    currency,
    exchange_rate: rate,
    amount_usd: amountUsd,
    description: description.trim(),
    occurred_at: `${occurredAt}T12:00:00-04:00`,
  };

  if (id) {
    const { error } = await supabase
      .from('transactions')
      .update(values)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('transactions').insert({ ...values, user_id: userId });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/manage');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/manage');
  revalidatePath('/');
}
