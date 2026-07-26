'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { categorySchema, type ActionState } from './schemas';

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = key === 'name' ? issue.message : 'required';
    }
  }
  return { fieldErrors };
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawDay = formData.get('recurringDay');
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    isRecurring: formData.get('isRecurring') === 'on',
    recurringDay: rawDay ? Number(rawDay) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, kind, isRecurring, recurringDay } = parsed.data;
  const id = (formData.get('id') as string) || null;

  // Lo recurrente solo aplica a categorías de gasto.
  const recurring = kind === 'expense' && isRecurring;
  const values = {
    name,
    kind,
    is_recurring: recurring,
    recurring_day: recurring ? recurringDay : null,
  };

  // v1: categorías planas. parent_id permanece en la tabla para uso futuro; al
  // editar no se toca (se conserva su valor), y al crear queda null por defecto.
  if (id) {
    const { error } = await supabase
      .from('categories')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('categories').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/categories');
  return { ok: true };
}

/** Borra una categoría propia no predeterminada. Los movimientos quedan sin categoría (FK set null). */
export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_system', false);

  revalidatePath('/categories');
}
