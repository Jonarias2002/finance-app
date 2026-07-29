'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, Caption, Pill, Figure } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PriceChart, type PricePoint } from './price-chart';
import type { ProductUnit } from './schemas';

type Props = {
  name: string;
  unit: ProductUnit;
  categoryName: string | null;
  isStaple: boolean;
  typicalDays: number | null;
  recurringDay: number | null;
  points: PricePoint[];
};

export function ProductDetail({
  name,
  unit,
  categoryName,
  isStaple,
  typicalDays,
  recurringDay,
  points,
}: Props) {
  const t = useTranslations('products');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');

  const values = points.map((p) => (currency === 'USD' ? p.usd : p.ves));
  const first = values[0];
  const last = values[values.length - 1];
  const change = first && last ? (last - first) / first : 0;

  return (
    <>
      <Link
        href="/manage?tab=products"
        className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('backToProducts')}
      </Link>

      <Card className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-section text-ink font-display">{name}</h2>
          {isStaple && <Pill>{t('staple')}</Pill>}
        </div>
        <Caption>
          {t(`units.${unit}`)}
          {categoryName ? ` · ${categoryName}` : ''}
          {typicalDays ? ` · ${t('everyDays', { count: typicalDays })}` : ''}
          {recurringDay ? ` · ${t('recurring.badge', { day: recurringDay })}` : ''}
        </Caption>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('priceHistory')}</CardTitle>
          <div
            role="radiogroup"
            aria-label={t('currency')}
            className="rounded-control border-line bg-surface-2 inline-flex gap-1 border p-1"
          >
            {(['USD', 'VES'] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                onClick={() => setCurrency(c)}
                className={cn(
                  'text-caption rounded-[6px] px-3 py-1 font-medium transition-colors',
                  currency === c ? 'bg-surface text-ink shadow-sm' : 'text-sage hover:text-ink',
                )}
              >
                {c === 'USD' ? '$' : 'Bs'}
              </button>
            ))}
          </div>
        </CardHeader>

        {points.length < 2 ? (
          <p className="text-caption text-sage py-6 text-center">{t('noPriceHistory')}</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-6">
              <div className="flex flex-col">
                <Caption>{t('latestPrice')}</Caption>
                <Figure amount={last ?? 0} currency={currency} size="md" />
              </div>
              <div className="flex flex-col">
                <Caption>{t('sinceFirst')}</Caption>
                <span
                  className={cn(
                    'tabular text-fig-md',
                    change > 0 ? 'text-ladrillo' : change < 0 ? 'text-verde' : 'text-sage',
                  )}
                >
                  {change > 0 ? '+' : ''}
                  {formatPercent(change)}
                </span>
              </div>
            </div>
            <PriceChart points={points} currency={currency} />
            {currency === 'VES' && <p className="text-caption text-sage mt-3">{t('vesHint')}</p>}
          </>
        )}
      </Card>
    </>
  );
}
