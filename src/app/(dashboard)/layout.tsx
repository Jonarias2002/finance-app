import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { DEFAULT_THEME, THEME_COOKIE, THEMES, type Theme } from '@/lib/theme';
import type { Locale } from '@/i18n/request';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user?.id ?? '')
    .eq('role', 'admin')
    .maybeSingle();

  const store = await cookies();
  const cookieTheme = store.get(THEME_COOKIE)?.value;
  const theme: Theme = THEMES.includes(cookieTheme as Theme)
    ? (cookieTheme as Theme)
    : DEFAULT_THEME;
  const locale = (await getLocale()) as Locale;

  return (
    <AppShell
      user={{
        email: user?.email ?? '',
        theme,
        locale,
        isAdmin: Boolean(adminRole),
      }}
    >
      {children}
    </AppShell>
  );
}
