'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PREF_COOKIE_OPTIONS } from '@/lib/cookies';
import { LOCALE_COOKIE, LOCALES, type Locale } from './request';

/**
 * Persiste el idioma elegido: cookie (fuente para el SSR de next-intl) y, si hay
 * sesión, el perfil (fuente de verdad entre dispositivos). Lo usa el toggle de
 * Ajustes; la escritura al perfil es best-effort.
 */
export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, PREF_COOKIE_OPTIONS);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ locale }).eq('id', user.id);
  }
}
