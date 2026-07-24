import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * i18n sin routing por URL (ADR 18): el idioma vive en una cookie, con el
 * navegador como valor inicial. Zona horaria fija America/Caracas (ADR 13).
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = LOCALES.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    timeZone: 'America/Caracas',
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
