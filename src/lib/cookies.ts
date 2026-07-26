/** Opciones comunes de las cookies de preferencia (idioma, tema): 1 año, todo el sitio. */
export const PREF_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
} as const;
