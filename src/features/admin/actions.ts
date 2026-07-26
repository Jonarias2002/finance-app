'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminState = { error?: string; ok?: boolean } | undefined;

/**
 * Devuelve el id del usuario actual solo si es admin; null en caso contrario.
 * Cada acción lo valida: una Server Action puede invocarse directamente, sin
 * pasar por el guard del layout.
 */
async function currentAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  return data ? user.id : null;
}

/** Restablece la contraseña de un usuario (ADR 08: recuperación por admin). */
export async function resetPassword(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const adminId = await currentAdminId();
  if (!adminId) return { error: 'forbidden' };

  const userId = String(formData.get('userId') ?? '');
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'passwordTooShort' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: 'generic' };
  return { ok: true };
}

export async function setUserAdmin(userId: string, makeAdmin: boolean) {
  const adminId = await currentAdminId();
  if (!adminId) return;
  // No permitir que un admin se quite el rol a sí mismo (evita quedar sin admins).
  if (userId === adminId && !makeAdmin) return;

  const admin = createAdminClient();
  if (makeAdmin) {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'admin' });
  } else {
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
  }
  revalidatePath('/admin');
}

export async function deleteUser(userId: string) {
  const adminId = await currentAdminId();
  if (!adminId) return;
  if (userId === adminId) return; // no borrarse a sí mismo

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath('/admin');
}
