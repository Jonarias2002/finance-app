'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getRateForDate } from '@/features/exchange-rates/get-latest-rate';
import {
  DEFAULT_RATE_SOURCE,
  RATE_SOURCES,
  type RateSource,
} from '@/features/exchange-rates/rate-history';
import type { Currency } from '@/lib/format';
import { syncSettled } from '@/features/debts/sync-settled';
import {
  DEBT_MODES,
  transactionSchema,
  transferSchema,
  type ActionState,
  type DebtMode,
} from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tasa manual que llega del formulario (Bs por 1 USD); vacío o inválido -> null. */
function manualRateFrom(formData: FormData): number | null {
  const n = Number(formData.get('exchangeRate'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lo que se teclea puede venir en otra moneda que la de la cuenta (pagar 500 Bs
 * con la cuenta en dólares). Todo pasa por USD con la tasa congelada:
 * `amount` sale en la moneda de la CUENTA —es lo que mueve el saldo— y
 * `amountUsd` es el valor canónico. Con la misma moneda a ambos lados la
 * conversión es identidad.
 */
function convertEntry(
  entryAmount: number,
  entryCurrency: Currency,
  accountCurrency: Currency,
  rate: number,
): { amount: number; amountUsd: number } {
  const usd = entryCurrency === 'VES' ? entryAmount / rate : entryAmount;
  return {
    amount: round2(accountCurrency === 'VES' ? usd * rate : usd),
    amountUsd: round2(usd),
  };
}

/** Deuda ya comprobada como del usuario. */
type DebtTarget = {
  id: string;
  currency: Currency;
  direction: 'i_owe' | 'owed_to_me';
  counterparty: string;
};

/**
 * Carga la deuda que el formulario dice pagar y comprueba que es del usuario:
 * RLS lo cubre, pero así no escribimos un abono huérfano si llega un id ajeno.
 */
async function loadDebt(
  supabase: SupabaseClient,
  userId: string,
  debtId: string | null,
): Promise<DebtTarget | null> {
  if (!debtId) return null;
  const { data } = await supabase
    .from('debts')
    .select('id, currency, direction, counterparty')
    .eq('id', debtId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    currency: data.currency as Currency,
    direction: data.direction as DebtTarget['direction'],
    counterparty: data.counterparty as string,
  };
}

/**
 * Sincroniza el abono que representa este movimiento sobre una deuda.
 *
 * El movimiento es el dinero que se movió; el abono es su efecto sobre la deuda.
 * Uno y otro se mantienen a la par aquí: si el movimiento deja de apuntar a una
 * deuda (o cambia de deuda), el abono viejo se borra. `is_settled` se recalcula
 * en las deudas tocadas — la anterior y la nueva.
 *
 * El monto va en la moneda de la DEUDA, convertido desde el valor canónico en USD
 * con la misma tasa congelada del movimiento.
 */
async function syncDebtPayment(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  debt: DebtTarget | null,
  mode: DebtMode,
  amountUsd: number,
  rate: number,
  occurredAt: string,
): Promise<void> {
  const debtId = debt?.id ?? null;
  const touched = new Set<string>();

  const { data: existing } = await supabase
    .from('debt_payments')
    .select('id, debt_id')
    .eq('transaction_id', transactionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing && existing.debt_id !== debtId) {
    await supabase.from('debt_payments').delete().eq('id', existing.id).eq('user_id', userId);
    touched.add(existing.debt_id as string);
  }

  if (debt) {
    const amount = round2(debt.currency === 'VES' ? amountUsd * rate : amountUsd);
    const values = {
      debt_id: debt.id,
      user_id: userId,
      amount,
      paid_at: occurredAt,
      transaction_id: transactionId,
    };
    if (existing && existing.debt_id === debt.id) {
      await supabase.from('debt_payments').update(values).eq('id', existing.id);
    } else {
      await supabase.from('debt_payments').insert(values);
    }
    touched.add(debt.id);
  }

  for (const id of touched) {
    // "Cancelar completa" cierra la deuda aunque el abono no cubra lo pendiente
    // (una condonación, un descuento). El resto se deduce de las sumas.
    if (id === debtId && mode === 'settle') {
      await supabase.from('debts').update({ is_settled: true }).eq('id', id).eq('user_id', userId);
    } else {
      await syncSettled(supabase, userId, id);
    }
  }
}

/** Deuda y modo que envía el formulario. Un modo raro se trata como abono. */
function debtFrom(formData: FormData): { debtId: string | null; mode: DebtMode } {
  const rawMode = String(formData.get('debtMode') ?? '');
  return {
    debtId: (formData.get('debtId') as string) || null,
    mode: DEBT_MODES.includes(rawMode as DebtMode) ? (rawMode as DebtMode) : 'partial',
  };
}

/** Fuente elegida en el formulario. Cualquier valor raro cae en la de por defecto. */
function rateSourceFrom(formData: FormData): RateSource {
  const raw = String(formData.get('rateSource') ?? '');
  return RATE_SOURCES.includes(raw as RateSource) ? (raw as RateSource) : DEFAULT_RATE_SOURCE;
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
 * 1) tasa manual que envía el formulario; 2) tasa histórica de la fuente elegida
 * (BCV por defecto) en la fecha `occurredAt` —la del día o la más reciente
 * anterior—; 3) al editar, la tasa ya congelada. Solo vale 1 cuando no hay
 * bolívares por ningún lado. Devuelve 'noRate' si no hay de dónde tomarla.
 */
async function rateFor(
  supabase: SupabaseClient,
  userId: string,
  id: string | null,
  currency: Currency,
  entryCurrency: Currency,
  occurredAt: string,
  manualRate: number | null,
  source: RateSource,
): Promise<number | 'noRate'> {
  if (currency !== 'VES' && entryCurrency !== 'VES') return 1;
  if (manualRate) return manualRate;

  const point = await getRateForDate(supabase, occurredAt, source);
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
  const rawStore = formData.get('storeId');
  const parsed = transactionSchema.safeParse({
    type: formData.get('type'),
    accountId: formData.get('accountId'),
    categoryId: rawCategory ? String(rawCategory) : null,
    storeId: rawStore ? String(rawStore) : null,
    amount: Number(formData.get('amount')),
    currency: formData.get('currency'),
    description: formData.get('description'),
    occurredAt: formData.get('occurredAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const {
    type,
    accountId,
    categoryId,
    storeId,
    amount: entryAmount,
    currency: entryCurrency,
    description,
    occurredAt,
  } = parsed.data;

  // El saldo de la cuenta manda: `amount` va siempre en la moneda de la cuenta,
  // aunque el monto se haya tecleado en la otra.
  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return { fieldErrors: { accountId: 'required' } };
  const currency = account.currency as Currency;

  const rate = await rateFor(
    supabase,
    user.id,
    id,
    currency,
    entryCurrency,
    occurredAt,
    manualRateFrom(formData),
    rateSourceFrom(formData),
  );
  if (rate === 'noRate') return { error: 'noRate' };

  const { amount, amountUsd } = convertEntry(entryAmount, entryCurrency, currency, rate);
  const converted = entryCurrency !== currency;

  // Un movimiento de deuda no trae descripción: el formulario no la pide porque
  // lo único que dice algo es a quién se le paga (o de quién se cobra).
  const { debtId, mode } = debtFrom(formData);
  const debt = await loadDebt(supabase, user.id, debtId);
  if (debtId && !debt) return { fieldErrors: { debtId: 'required' } };
  const finalDescription =
    description ||
    (debt ? `${debt.direction === 'i_owe' ? 'Abono a' : 'Cobro a'} ${debt.counterparty}` : '');
  if (!finalDescription) return { fieldErrors: { description: 'required' } };

  const values = {
    type,
    account_id: accountId,
    // La deuda sustituye a la categoría: un abono no clasifica un gasto.
    category_id: debt ? null : categoryId,
    store_id: debt ? null : storeId,
    transfer_account_id: null,
    amount,
    currency,
    // Solo se guarda el original cuando aporta algo: si se tecleó en la moneda de
    // la cuenta, `amount` ya es exactamente lo que se escribió.
    entry_amount: converted ? round2(entryAmount) : null,
    entry_currency: converted ? entryCurrency : null,
    exchange_rate: rate,
    amount_usd: amountUsd,
    description: finalDescription,
    occurred_at: `${occurredAt}T12:00:00-04:00`, // mediodía Caracas (ADR 13)
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase
      .from('transactions')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { data: inserted, error } = await supabase
      .from('transactions')
      .insert({ ...values, user_id: user.id })
      .select('id')
      .single();
    if (error || !inserted) return { error: 'generic' };
    savedId = inserted.id as string;
  }

  // El abono va después del movimiento: necesita su id para enlazarse.
  await syncDebtPayment(
    supabase,
    user.id,
    savedId!,
    debt,
    mode,
    amountUsd,
    rate,
    values.occurred_at,
  );

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/debts');
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
    currency: formData.get('currency'),
    description: formData.get('description'),
    occurredAt: formData.get('occurredAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const {
    accountId,
    transferAccountId,
    amount: entryAmount,
    currency: entryCurrency,
    description,
    occurredAt,
  } = parsed.data;

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

  const currency = source.currency as Currency;
  const rate = await rateFor(
    supabase,
    userId,
    id,
    currency,
    entryCurrency,
    occurredAt,
    manualRateFrom(formData),
    rateSourceFrom(formData),
  );
  if (rate === 'noRate') return { error: 'noRate' };
  const { amount, amountUsd } = convertEntry(entryAmount, entryCurrency, currency, rate);
  const converted = entryCurrency !== currency;

  const values = {
    type: 'transfer' as const,
    account_id: accountId,
    transfer_account_id: transferAccountId,
    category_id: null,
    store_id: null,
    amount,
    currency,
    entry_amount: converted ? round2(entryAmount) : null,
    entry_currency: converted ? entryCurrency : null,
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

  // Si el movimiento abonaba una deuda, el abono se va con él por el cascade —
  // pero is_settled no se recalcula solo. Hay que saber a qué deuda tocaba antes
  // de borrar, y volver a sincronizarla después.
  const { data: payment } = await supabase
    .from('debt_payments')
    .select('debt_id')
    .eq('transaction_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);

  if (payment) {
    await syncSettled(supabase, user.id, payment.debt_id as string);
    revalidatePath('/debts');
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/manage');
  revalidatePath('/');
}
