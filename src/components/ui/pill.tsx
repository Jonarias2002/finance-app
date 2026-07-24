'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

type PillProps = React.ComponentProps<'span'> & {
  /** Color de la categoría. Se pinta como punto, no como fondo. */
  dot?: string;
};

/** Categoría de un movimiento. */
export function Pill({ dot, className, children, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'border-line bg-canvas text-caption text-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </span>
  );
}

type Status = 'paid' | 'pending' | 'overdue' | 'done';

const STATUS: Record<Status, string> = {
  paid: 'border-verde/40 text-verde',
  pending: 'border-line text-sage',
  overdue: 'border-ladrillo/40 text-ladrillo',
  done: 'border-verde/40 text-verde',
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const t = useTranslations('status');
  return (
    <span
      className={cn(
        'text-caption inline-flex items-center rounded-full border bg-transparent px-2.5 py-0.5 font-medium',
        STATUS[status],
      )}
    >
      {label ?? t(status)}
    </span>
  );
}
