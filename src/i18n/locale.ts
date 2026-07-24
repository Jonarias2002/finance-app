'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, LOCALES, type Locale } from './request';

/** Persiste el idioma elegido en la cookie. Lo usa el toggle de Ajustes. */
export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
