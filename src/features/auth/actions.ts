'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { credentialsSchema, type AuthState } from './schemas';

function fieldErrorsFrom(error: import('zod').ZodError): AuthState {
  const fieldErrors: { email?: string; password?: string } = {};
  for (const issue of error.issues) {
    const path = issue.path[0];
    if (path === 'email') fieldErrors.email = 'invalidEmail';
    if (path === 'password') fieldErrors.password = 'passwordTooShort';
  }
  return { fieldErrors };
}

/**
 * Login o registro según el campo `mode` del formulario. La confirmación por
 * correo está desactivada (ADR 07), así que el registro deja sesión iniciada.
 */
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode');
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();

  if (mode === 'signup') {
    const { error } = await supabase.auth.signUp(parsed.data);
    if (error) {
      const taken = /already registered|already exists/i.test(error.message);
      return { error: taken ? 'emailTaken' : 'generic' };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: 'invalidCredentials' };
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
