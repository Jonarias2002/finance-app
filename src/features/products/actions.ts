'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { productSchema, storeSchema, type ActionState } from './schemas';

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

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rawCat = formData.get('defaultCategoryId');
  const rawDays = formData.get('typicalDays');
  const rawRecurringDay = formData.get('recurringDay');
  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    unit: formData.get('unit'),
    defaultCategoryId: rawCat ? String(rawCat) : null,
    isStaple: formData.get('isStaple') === 'on',
    typicalDays: rawDays ? Number(rawDays) : null,
    isRecurring: formData.get('isRecurring') === 'on',
    recurringDay: rawRecurringDay ? Number(rawRecurringDay) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, unit, defaultCategoryId, isStaple, typicalDays, isRecurring, recurringDay } =
    parsed.data;
  const values = {
    name: name.trim(),
    unit,
    default_category_id: defaultCategoryId,
    is_staple: isStaple,
    typical_days: typicalDays,
    is_recurring: isRecurring,
    recurring_day: isRecurring ? recurringDay : null,
  };

  const id = (formData.get('id') as string) || null;
  if (id) {
    const { error } = await supabase
      .from('products')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('products').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/products');
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('products').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/products');
}

export async function saveStore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const parsed = storeSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const name = parsed.data.name.trim();
  const id = (formData.get('id') as string) || null;
  if (id) {
    const { error } = await supabase
      .from('stores')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('stores').insert({ name, user_id: user.id });
    if (error) return { error: 'generic' };
  }

  revalidatePath('/products');
  revalidatePath('/shopping');
  return { ok: true };
}

export async function deleteStore(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('stores').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/products');
  revalidatePath('/shopping');
}
