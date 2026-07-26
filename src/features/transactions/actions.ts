'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { transactionSchema, transferSchema, type ActionState } from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

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

/** Tasa a usar: al editar se conserva la congelada; al crear, la última conocida. */
async function rateFor(
  supabase: SupabaseClient,
  userId: string,
  id: string | null,
  currency: 'USD' | 'VES',
): Promise<number | 'noRate'> {
  if (id) {
    const { data } = await supabase
      .from('transactions')
      .select('exchange_rate')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    return data ? Number(data.exchange_rate) : 1;
  }
  const latest = await getLatestRate(supabase);
  if (currency === 'VES') return latest ? latest.rate : 'noRate';
  return latest?.rate ?? 1;
}

/**
 * Crea o actualiza un movimiento. La moneda y el monto en USD se derivan en el
 * servidor a partir de la cuenta y de la tasa del día: el cliente no fija la tasa.
 * Al editar se conserva la tasa original congelada (ADR 12).
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
  const rawFixedDay = formData.get('fixedDay');
  const parsed = transactionSchema.safeParse({
    type: formData.get('type'),
    accountId: formData.get('accountId'),
    categoryId: rawCategory ? String(rawCategory) : null,
    amount: Number(formData.get('amount')),
    description: formData.get('description'),
    occurredAt: formData.get('occurredAt'),
    isFixed: formData.get('isFixed') === 'on',
    fixedDay: rawFixedDay ? Number(rawFixedDay) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { type, accountId, categoryId, amount, description, occurredAt, isFixed, fixedDay } =
    parsed.data;

  // La cuenta define la moneda del movimiento (integridad del saldo).
  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return { fieldErrors: { accountId: 'required' } };
  const currency = account.currency as 'USD' | 'VES';

  const rate = await rateFor(supabase, user.id, id, currency);
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
    // Una sola casilla: marcada => plantilla de gasto fijo (fuera del saldo).
    is_fixed: isFixed,
    is_template: isFixed,
    fixed_day: isFixed ? fixedDay : null,
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
  const rate = await rateFor(supabase, userId, id, currency);
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
  revalidatePath('/');
}

/**
 * "Registrar ahora": genera un movimiento real a partir de una plantilla de gasto
 * fijo. Copia sus datos, marca template_id y congela la tasa del día. Este sí baja
 * el saldo (is_template=false), mientras que la plantilla original queda intacta.
 */
export async function postTemplate(templateId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { data: tpl } = await supabase
    .from('transactions')
    .select('account_id, category_id, type, amount, currency, description')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .eq('is_template', true)
    .maybeSingle();
  if (!tpl) return { error: 'generic' };

  const currency = tpl.currency as 'USD' | 'VES';
  const latest = await getLatestRate(supabase);
  if (currency === 'VES' && !latest) return { error: 'noRate' };
  const rate = latest?.rate ?? 1;
  const amount = round2(Number(tpl.amount));
  const amountUsd = currency === 'VES' ? round2(amount / rate) : round2(amount);

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: tpl.account_id,
    category_id: tpl.category_id,
    type: tpl.type,
    transfer_account_id: null,
    amount,
    currency,
    exchange_rate: rate,
    amount_usd: amountUsd,
    description: tpl.description,
    occurred_at: `${today}T12:00:00-04:00`,
    is_fixed: false,
    is_template: false,
    fixed_day: null,
    template_id: templateId,
  });
  if (error) return { error: 'generic' };

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true };
}
