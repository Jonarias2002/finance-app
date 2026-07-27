'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Theme } from '@/lib/theme';
import type { Locale } from '@/i18n/request';
import { ThemeToggle } from '@/features/settings/theme-toggle';
import { LanguageToggle } from '@/features/settings/language-toggle';
import { logout } from '@/features/auth/actions';

type Props = {
  email: string;
  theme: Theme;
  locale: Locale;
  isAdmin: boolean;
};

export function UserMenu({ email, theme, locale, isAdmin }: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = email.trim().charAt(0).toUpperCase() || '?';

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.account')}
        className="bg-ink text-canvas flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="rounded-control border-line bg-surface absolute top-full right-0 z-50 mt-2 w-72 border p-4 shadow-lg"
        >
          <p className="text-caption text-sage mb-3 truncate" title={email}>
            {email}
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-label text-sage">{t('settings.theme.label')}</span>
              <ThemeToggle initial={theme} />
            </div>

            <div className="space-y-1.5">
              <span className="text-label text-sage">{t('settings.language.label')}</span>
              <LanguageToggle initial={locale} />
            </div>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              role="menuitem"
              className={cn(
                'rounded-control text-body text-sage hover:bg-surface-2 hover:text-ink',
                'mt-3 flex items-center gap-3 px-2 py-2 transition-colors',
              )}
            >
              <ShieldCheck className="size-[18px] shrink-0" aria-hidden />
              {t('admin.link')}
            </Link>
          )}

          <form action={logout} className="border-line mt-3 border-t pt-3">
            <button
              type="submit"
              role="menuitem"
              className="rounded-control text-body text-sage hover:bg-surface-2 hover:text-ink flex w-full items-center gap-3 px-2 py-2 transition-colors"
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              {t('nav.logout')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
