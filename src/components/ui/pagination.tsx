'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Paginación en cliente: recorta una lista ya filtrada a `pageSize` por página
 * (10 por defecto). Devuelve la página actual acotada al rango válido.
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return { page: current, setPage, pageCount, pageItems, total: items.length, pageSize };
}

/** Ventana de a lo sumo 5 números de página alrededor del actual. */
function pageWindow(page: number, pageCount: number): number[] {
  const span = 5;
  const end = Math.min(pageCount, Math.max(page + 2, span));
  const start = Math.max(1, Math.min(page - 2, end - span + 1));
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  className?: string;
}) {
  const t = useTranslations('pagination');
  if (pageCount <= 1) return null;
  const pages = pageWindow(page, pageCount);

  const arrow = (target: number, label: string, icon: React.ReactNode, disabled: boolean) => (
    <button
      type="button"
      onClick={() => onPageChange(target)}
      disabled={disabled}
      aria-label={label}
      className="rounded-control text-sage hover:bg-surface-2 hover:text-ink flex size-8 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      {icon}
    </button>
  );

  return (
    <nav
      aria-label={t('label')}
      className={cn('flex items-center justify-between gap-2 pt-4', className)}
    >
      <span className="text-caption text-sage">{t('pageOf', { page, total: pageCount })}</span>
      <div className="flex items-center gap-1">
        {arrow(page - 1, t('previous'), <ChevronLeft className="size-4" />, page <= 1)}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'rounded-control text-caption flex size-8 items-center justify-center font-medium transition-colors',
              p === page ? 'bg-ink text-canvas' : 'text-sage hover:bg-surface-2 hover:text-ink',
            )}
          >
            {p}
          </button>
        ))}
        {arrow(page + 1, t('next'), <ChevronRight className="size-4" />, page >= pageCount)}
      </div>
    </nav>
  );
}
