'use client';

import { useTranslations } from 'next-intl';
import { Figure } from './figure';
import { Caption } from './label';

type BalanceBarProps = {
  total: number;
  reserved?: number;
  /** Oculta las etiquetas inferiores (útil en tarjetas compactas de cuenta). */
  compact?: boolean;
};

/**
 * ELEMENTO FIRMA de FinWise.
 * Una sola barra que parte el saldo en disponible (sólido) y
 * reservado (rayado diagonal). Es la regla de negocio hecha imagen.
 */
export function BalanceBar({ total, reserved = 0, compact = false }: BalanceBarProps) {
  const t = useTranslations('balanceBar');
  const safeTotal = Math.max(total, 0);
  const res = Math.min(Math.max(reserved, 0), safeTotal);
  const available = safeTotal - res;
  const availablePct = safeTotal > 0 ? (available / safeTotal) * 100 : 100;

  return (
    <div className="space-y-3">
      <div className="bg-line flex h-2 w-full overflow-hidden rounded-full">
        <div className="bg-ink h-full" style={{ width: `${availablePct}%` }} />
        {res > 0 && (
          <div
            className="hatch-ocre border-surface h-full border-l"
            style={{ width: `${100 - availablePct}%` }}
          />
        )}
      </div>

      {!compact && (
        <div className="flex gap-8">
          <div className="flex flex-col">
            <Caption>{t('available')}</Caption>
            <Figure amount={available} size="md" />
          </div>
          {res > 0 && (
            <div className="flex flex-col">
              <Caption>{t('reserved')}</Caption>
              <Figure amount={res} size="md" tone="reserved" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
