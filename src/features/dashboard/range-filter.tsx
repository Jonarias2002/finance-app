'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { RANGES, type Range } from './ranges';

export function RangeFilter({ active }: { active: Range }) {
  const t = useTranslations('dashboard.ranges');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(range: Range) {
    const next = new URLSearchParams(params);
    next.set('range', range);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className="rounded-control border-line bg-surface-2 inline-flex gap-1 border p-1"
    >
      {RANGES.map((range) => {
        const isActive = range === active;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => select(range)}
            className={cn(
              'text-caption rounded-[6px] px-3 py-1.5 font-medium transition-colors',
              isActive ? 'bg-surface text-ink shadow-sm' : 'text-sage hover:text-ink',
            )}
          >
            {t(range)}
          </button>
        );
      })}
    </div>
  );
}
