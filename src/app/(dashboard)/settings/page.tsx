import { cookies } from 'next/headers';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, Caption } from '@/components/ui';
import { DEFAULT_THEME, THEME_COOKIE, THEMES, type Theme } from '@/lib/theme';
import type { Locale } from '@/i18n/request';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/features/settings/theme-toggle';
import { LanguageToggle } from '@/features/settings/language-toggle';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const tAdmin = await getTranslations('admin');
  const locale = (await getLocale()) as Locale;

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
  const isAdmin = Boolean(adminRole);

  const store = await cookies();
  const cookieTheme = store.get(THEME_COOKIE)?.value;
  const theme: Theme = THEMES.includes(cookieTheme as Theme)
    ? (cookieTheme as Theme)
    : DEFAULT_THEME;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle>{t('appearance.title')}</CardTitle>
            <Caption>{t('appearance.description')}</Caption>
          </div>
        </CardHeader>
        <ThemeToggle initial={theme} />
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle>{t('language.title')}</CardTitle>
            <Caption>{t('language.description')}</Caption>
          </div>
        </CardHeader>
        <LanguageToggle initial={locale} />
      </Card>

      {isAdmin && (
        <Link href="/admin" className="block">
          <Card className="hover:bg-surface-2 flex items-center gap-3 transition-colors">
            <ShieldCheck className="text-brand size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <CardTitle>{tAdmin('link')}</CardTitle>
              <Caption>{tAdmin('linkHint')}</Caption>
            </div>
            <ChevronRight className="text-sage size-5 shrink-0" aria-hidden />
          </Card>
        </Link>
      )}
    </>
  );
}
