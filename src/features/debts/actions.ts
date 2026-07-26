'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { debtSchema, paymentSchema, type ActionState } from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors };
}

/** Marca la deuda como saldada cuando los abonos cubren el principal (y viceversa). */
async function syncSettled(supabase: SupabaseClient, userId: string, debtId: string) {
  const { data: debt } = await supabase
    .from('debts')
    .select('principal')
    .eq('id', debtId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!debt) return;

  const { data: payments } = await supabase
    .from('debt_payments')
    .select('amount')
    .eq('debt_id', debtId);
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  await supabase
    .from('debts')
    .update({ is_settled: round2(paid) >= Number(debt.principal) })
    .eq('id', debtId)
    .eq('user_id', userId);
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

export async function addPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawNote = formData.get('note');
  const parsed = paymentSchema.safeParse({
    debtId: formData.get('debtId'),
    amount: Number(formData.get('amount')),
    note: rawNote ? String(rawNote) : null,
    paidAt: formData.get('paidAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { debtId, amount, note, paidAt } = parsed.data;

  // La deuda debe ser del usuario (RLS también lo cubre, pero fallamos claro).
  const { data: debt } = await supabase
    .from('debts')
    .select('id')
    .eq('id', debtId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!debt) return { error: 'generic' };

  const { error } = await supabase.from('debt_payments').insert({
    debt_id: debtId,
    user_id: user.id,
    amount: round2(amount),
    note: note?.trim() || null,
    paid_at: `${paidAt}T12:00:00-04:00`,
  });
  if (error) return { error: 'generic' };

  await syncSettled(supabase, user.id, debtId);
  revalidatePath('/debts');
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
    .select('debt_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!payment) return;

  await supabase.from('debt_payments').delete().eq('id', id).eq('user_id', user.id);
  await syncSettled(supabase, user.id, payment.debt_id as string);
  revalidatePath('/debts');
}
