'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { accountSchema, type ActionState } from './schemas';

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      // Los enums (type/currency) sólo fallan si manipulan el form: genérico.
      fieldErrors[key] = key === 'name' ? issue.message : 'required';
    }
  }
  return { fieldErrors };
}

/** Crea o actualiza una cuenta según venga o no `id` en el formulario. */
export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawBank = formData.get('bankId');
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency'),
    bankId: rawBank ? Number(rawBank) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, type, currency, bankId } = parsed.data;
  const values = {
    name,
    type,
    currency,
    // El banco sólo aplica a cuentas de tipo `bank`.
    bank_id: type === 'bank' ? bankId : null,
  };

  const id = (formData.get('id') as string) || null;

  if (id) {
    const { error } = await supabase
      .from('accounts')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('accounts').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/accounts');
  return { ok: true };
}

/** Archiva o restaura una cuenta (no se borra: hay movimientos que la referencian). */
export async function setAccountArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('accounts')
    .update({ is_archived: archived, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/accounts');
}
