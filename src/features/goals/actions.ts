'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { contributionSchema, goalSchema, type ActionState } from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors };
}

async function savedFor(supabase: SupabaseClient, goalId: string): Promise<number> {
  const { data } = await supabase.from('goal_contributions').select('amount').eq('goal_id', goalId);
  return round2((data ?? []).reduce((sum, c) => sum + Number(c.amount), 0));
}

/** Marca la meta como cumplida cuando lo ahorrado alcanza el objetivo (y viceversa). */
async function syncAchieved(supabase: SupabaseClient, userId: string, goalId: string) {
  const { data: goal } = await supabase
    .from('savings_goals')
    .select('target_amount')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!goal) return;
  const saved = await savedFor(supabase, goalId);
  await supabase
    .from('savings_goals')
    .update({ is_achieved: saved >= Number(goal.target_amount) })
    .eq('id', goalId)
    .eq('user_id', userId);
}

export async function saveGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawDate = formData.get('targetDate');
  const parsed = goalSchema.safeParse({
    name: formData.get('name'),
    accountId: formData.get('accountId'),
    targetAmount: Number(formData.get('targetAmount')),
    targetDate: rawDate ? String(rawDate) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, accountId, targetAmount, targetDate } = parsed.data;

  // La meta reserva dinero dentro de una cuenta: hereda su moneda.
  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return { fieldErrors: { accountId: 'required' } };

  const values = {
    name: name.trim(),
    account_id: accountId,
    target_amount: round2(targetAmount),
    currency: account.currency,
    target_date: targetDate,
  };

  const id = (formData.get('id') as string) || null;

  if (id) {
    const { error } = await supabase
      .from('savings_goals')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
    await syncAchieved(supabase, user.id, id);
  } else {
    const { error } = await supabase.from('savings_goals').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('savings_goals').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function setGoalAchieved(id: string, achieved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('savings_goals')
    .update({ is_achieved: achieved })
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function addContribution(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawNote = formData.get('note');
  const parsed = contributionSchema.safeParse({
    goalId: formData.get('goalId'),
    kind: formData.get('kind'),
    amount: Number(formData.get('amount')),
    note: rawNote ? String(rawNote) : null,
    contributedAt: formData.get('contributedAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { goalId, kind, amount, note, contributedAt } = parsed.data;

  const { data: goal } = await supabase
    .from('savings_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!goal) return { error: 'generic' };

  // No se puede retirar más de lo ahorrado.
  if (kind === 'withdraw') {
    const saved = await savedFor(supabase, goalId);
    if (round2(amount) > saved) return { error: 'exceedsSaved' };
  }

  const signed = kind === 'withdraw' ? -round2(amount) : round2(amount);
  const { error } = await supabase.from('goal_contributions').insert({
    goal_id: goalId,
    user_id: user.id,
    amount: signed,
    note: note?.trim() || null,
    contributed_at: `${contributedAt}T12:00:00-04:00`,
  });
  if (error) return { error: 'generic' };

  await syncAchieved(supabase, user.id, goalId);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteContribution(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: contribution } = await supabase
    .from('goal_contributions')
    .select('goal_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!contribution) return;

  await supabase.from('goal_contributions').delete().eq('id', id).eq('user_id', user.id);
  await syncAchieved(supabase, user.id, contribution.goal_id as string);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/');
}
