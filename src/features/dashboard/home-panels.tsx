'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import { Card, CardHeader, CardTitle, Caption, Pill, Progress } from '@/components/ui';
import { formatMoney, formatDayMonth, type Currency } from '@/lib/format';

export type ServiceItem = {
  id: string;
  name: string;
  categoryName: string | null;
  date: string; // YYYY-MM-DD del próximo pago
  daysAway: number;
};

export type GoalItem = {
  id: string;
  name: string;
  currency: Currency;
  saved: number;
  target: number;
};

export type DebtItem = {
  id: string;
  counterparty: string;
  direction: 'i_owe' | 'owed_to_me';
  currency: Currency;
  paid: number;
  principal: number;
};

/** Encabezado con título y enlace "ver todo" a la sección completa. */
function PanelHeader({ title, href, seeAll }: { title: string; href: string; seeAll: string }) {
  return (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <Link
        href={href}
        className="text-sage hover:text-ink text-caption inline-flex items-center gap-1 transition-colors"
      >
        {seeAll}
        <ArrowUpRight className="size-3.5" />
      </Link>
    </CardHeader>
  );
}

export function UpcomingServices({ items }: { items: ServiceItem[] }) {
  const t = useTranslations('dashboard.home');

  const when = (daysAway: number) => {
    if (daysAway <= 0) return t('dueToday');
    if (daysAway === 1) return t('dueTomorrow');
    return t('dueInDays', { days: daysAway });
  };

  return (
    <Card>
      <PanelHeader title={t('upcomingTitle')} href="/products" seeAll={t('seeAll')} />
      <ul className="divide-line divide-y">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <CalendarClock aria-hidden className="text-sage size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <Link href={`/products/${s.id}`} className="text-ink font-medium hover:underline">
                {s.name}
              </Link>
              {s.categoryName && <Caption className="line-clamp-1">{s.categoryName}</Caption>}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-caption text-ink tabular">
                {formatDayMonth(`${s.date}T12:00:00-04:00`)}
              </span>
              <span className="text-label text-sage">{when(s.daysAway)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GoalsProgress({ items }: { items: GoalItem[] }) {
  const t = useTranslations('dashboard.home');

  return (
    <Card>
      <PanelHeader title={t('goalsTitle')} href="/goals" seeAll={t('seeAll')} />
      <ul className="space-y-4">
        {items.map((g) => {
          const remaining = Math.max(g.target - g.saved, 0);
          return (
            <li key={g.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <Link
                  href={`/goals/${g.id}`}
                  className="text-ink min-w-0 truncate font-medium hover:underline"
                >
                  {g.name}
                </Link>
                <span className="text-caption text-sage tabular shrink-0">
                  {formatMoney(g.saved, g.currency)} / {formatMoney(g.target, g.currency)}
                </span>
              </div>
              <Progress value={g.saved} max={g.target} tone="ocre" />
              {remaining > 0 && (
                <Caption className="mt-1">
                  {t('remaining')} {formatMoney(remaining, g.currency)}
                </Caption>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function DebtsProgress({ items }: { items: DebtItem[] }) {
  const t = useTranslations('dashboard.home');
  const td = useTranslations('debts');

  return (
    <Card>
      <PanelHeader title={t('debtsTitle')} href="/debts" seeAll={t('seeAll')} />
      <ul className="space-y-4">
        {items.map((d) => {
          const remaining = Math.max(d.principal - d.paid, 0);
          return (
            <li key={d.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/debts/${d.id}`}
                    className="text-ink truncate font-medium hover:underline"
                  >
                    {d.counterparty}
                  </Link>
                  <Pill>{td(`groups.${d.direction}`)}</Pill>
                </span>
                <span className="text-caption text-sage tabular shrink-0">
                  {formatMoney(d.paid, d.currency)} / {formatMoney(d.principal, d.currency)}
                </span>
              </div>
              <Progress
                value={d.paid}
                max={d.principal}
                tone={d.direction === 'owed_to_me' ? 'verde' : 'ink'}
              />
              {remaining > 0 && (
                <Caption className="mt-1">
                  {t('remaining')} {formatMoney(remaining, d.currency)}
                </Caption>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
