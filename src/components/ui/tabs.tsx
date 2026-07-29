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
      // El desbordamiento se contiene aquí: sin esto, cuatro pestañas empujan el
      // ancho de toda la página en móvil y la vista entera se desplaza de lado.
      className={cn('border-line no-scrollbar flex gap-1 overflow-x-auto border-b', className)}
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
              // Más compactas en móvil para que las cuatro de Gestión quepan sin
              // deslizar; `shrink-0` + `nowrap` evita que se estrujen o partan.
              'text-caption sm:text-body -mb-px shrink-0 border-b-2 px-3 py-2 font-medium whitespace-nowrap transition-colors sm:px-4',
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
