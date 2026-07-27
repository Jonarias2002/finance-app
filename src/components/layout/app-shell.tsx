'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  ArrowLeftRight,
  HandCoins,
  Target,
  SlidersHorizontal,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { UserMenu } from '@/components/layout/user-menu';
import type { Theme } from '@/lib/theme';
import type { Locale } from '@/i18n/request';

/** Rutas en inglés (convención del proyecto); las etiquetas se traducen. */
const NAV = [
  { href: '/', key: 'home', icon: LayoutDashboard, mobile: true },
  { href: '/transactions', key: 'transactions', icon: ArrowLeftRight, mobile: true },
  { href: '/debts', key: 'debts', icon: HandCoins, mobile: true },
  { href: '/goals', key: 'goals', icon: Target, mobile: true },
  { href: '/manage', key: 'manage', icon: SlidersHorizontal, mobile: true },
] as const;

/** Rutas sin item propio en la navegación, solo para resolver el encabezado:
 *  Compras vive en un FAB; las páginas de detalle de producto pertenecen a Gestión;
 *  las rutas viejas de cuentas/categorías redirigen a /manage. */
const EXTRA = [
  { href: '/shopping', key: 'shopping' },
  { href: '/products', key: 'manage' },
  { href: '/accounts', key: 'manage' },
  { href: '/categories', key: 'manage' },
] as const;
const SHOPPING = EXTRA[0];

type AppShellProps = {
  /** Si se omite, el título es la etiqueta de la sección activa. */
  title?: string;
  cycleLabel?: string;
  user: { email: string; theme: Theme; locale: Locale; isAdmin: boolean };
  children: React.ReactNode;
};

export function AppShell({ title, cycleLabel, user, children }: AppShellProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const activeKey = [...NAV, ...EXTRA].find((n) => isActive(n.href))?.key ?? 'home';
  const heading = title ?? t(activeKey);

  return (
    <div className="bg-canvas min-h-dvh">
      {/* Barra lateral — escritorio */}
      <nav className="border-line bg-surface fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r p-4 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="text-section text-ink font-[family-name:var(--font-bricolage)]">
            FinWise
          </span>
        </Link>

        <ul className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'rounded-control text-body flex h-11 items-center gap-3 px-3 transition-colors',
                  isActive(href)
                    ? 'bg-surface-2 text-ink font-medium'
                    : 'text-sage hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Barra superior */}
      <header className="border-line bg-surface fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 border-b px-4 lg:left-60">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-title text-ink truncate font-[family-name:var(--font-bricolage)]">
            {heading}
          </h1>
          {cycleLabel && (
            <span className="border-line bg-canvas text-caption text-sage hidden shrink-0 rounded-full border px-3 py-0.5 md:inline">
              {cycleLabel}
            </span>
          )}
        </div>
        <UserMenu
          email={user.email}
          theme={user.theme}
          locale={user.locale}
          isAdmin={user.isAdmin}
        />
      </header>

      <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-20 pb-24 md:px-8 lg:pl-64">
        {children}
      </main>

      {/* Barra inferior — móvil */}
      <nav className="border-line bg-surface fixed inset-x-0 bottom-0 z-40 flex h-16 border-t lg:hidden">
        {NAV.filter((n) => n.mobile).map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px]',
              isActive(href) ? 'text-ink' : 'text-sage',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </nav>

      {/* Botón flotante de Compras — siempre en la esquina inferior derecha.
          En móvil sube por encima de la barra inferior; en escritorio va al borde. */}
      <Link
        href={SHOPPING.href}
        aria-label={t(SHOPPING.key)}
        aria-current={isActive(SHOPPING.href) ? 'page' : undefined}
        className={cn(
          'bg-ink text-canvas fixed right-4 bottom-20 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-opacity hover:opacity-90 lg:right-6 lg:bottom-6',
          isActive(SHOPPING.href) && 'ring-ink ring-offset-canvas ring-2 ring-offset-2',
        )}
      >
        <ShoppingCart className="size-6" aria-hidden />
      </Link>
    </div>
  );
}
