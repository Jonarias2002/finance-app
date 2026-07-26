'use client';

import { cn } from '@/lib/cn';

type Tab<T extends string> = { value: T; label: string };

/** Pestañas con subrayado para dividir una tabla en vistas (p. ej. ingresos/gastos). */
export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  tabs: readonly Tab<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('border-line flex gap-1 border-b', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'text-body -mb-px border-b-2 px-4 py-2 font-medium transition-colors',
              active ? 'border-ink text-ink' : 'text-sage hover:text-ink border-transparent',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
