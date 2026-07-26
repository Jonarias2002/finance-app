'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PREF_COOKIE_OPTIONS } from '@/lib/cookies';
import { LOCALE_COOKIE } from '@/i18n/request';
import { THEME_COOKIE } from '@/lib/theme';
import { credentialsSchema, type AuthState } from './schemas';

/**
 * Al iniciar sesión, sincroniza las preferencias guardadas en el perfil hacia
 * las cookies, para que idioma y tema viajen con el usuario entre dispositivos.
 */
async function hydratePrefsFromProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('profiles')
    .select('locale, theme')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return;

  const store = await cookies();
  if (data.locale) store.set(LOCALE_COOKIE, data.locale, PREF_COOKIE_OPTIONS);
  if (data.theme) store.set(THEME_COOKIE, data.theme, PREF_COOKIE_OPTIONS);
}

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
    await hydratePrefsFromProfile(supabase);
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
