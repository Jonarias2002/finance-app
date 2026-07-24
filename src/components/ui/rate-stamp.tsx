'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { formatRate, formatDayMonth } from '@/lib/format';

type RateStampProps = {
  rate: number;
  source: 'BCV' | 'Paralelo';
  date: Date | string;
  /** true cuando la sincronización del día falló. */
  stale?: boolean;
};

/** Sello persistente de la tasa del día en la barra superior. */
export function RateStamp({ rate, source, date, stale = false }: RateStampProps) {
  const t = useTranslations('rateStamp');
  return (
    <div
      title={stale ? t('staleTitle') : undefined}
      className={cn(
        'tabular text-caption inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1',
        stale ? 'border-ocre text-ocre' : 'border-line text-sage',
      )}
    >
      <span>Bs {formatRate(rate)}</span>
      <span aria-hidden>·</span>
      <span>{source}</span>
      <span aria-hidden>·</span>
      <span>{stale ? t('stale') : formatDayMonth(date)}</span>
    </div>
  );
}
