'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PREF_COOKIE_OPTIONS } from '@/lib/cookies';
import { THEME_COOKIE, THEMES, type Theme } from '@/lib/theme';

/**
 * Persiste el tema elegido: cookie (caché para SSR y el script anti-parpadeo) y,
 * si hay sesión, el perfil (fuente de verdad entre dispositivos). La escritura al
 * perfil es best-effort: el toggle ya aplicó el cambio en el cliente.
 */
export async function setTheme(theme: Theme) {
  if (!THEMES.includes(theme)) return;

  const store = await cookies();
  store.set(THEME_COOKIE, theme, PREF_COOKIE_OPTIONS);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ theme }).eq('id', user.id);
  }
}
