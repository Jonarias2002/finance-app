'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { formatMoney, formatRate, formatShortDate, type Currency } from '@/lib/format';

type AmountInputProps = {
  value: string;
  currency: Currency;
  /** Bolívares por 1 USD, tomada de la tabla exchange_rates. */
  rate: number;
  rateDate: Date | string;
  onValueChange: (value: string) => void;
  onCurrencyChange: (currency: Currency) => void;
  onEditRate?: () => void;
};

/**
 * El control más grande de cualquier formulario.
 * Convierte en vivo bolívares a dólares con la tasa del día.
 */
export function AmountInput({
  value,
  currency,
  rate,
  rateDate,
  onValueChange,
  onCurrencyChange,
  onEditRate,
}: AmountInputProps) {
  const t = useTranslations('amountInput');
  const numeric = Number(value.replace(/\./g, '').replace(',', '.')) || 0;
  const usd = currency === 'VES' ? numeric / rate : numeric;

  return (
    <div className="space-y-2">
      <div className="rounded-control border-line bg-surface focus-within:border-line-strong flex items-center border pr-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-label={t('amount')}
          className="tabular text-ink h-16 w-full bg-transparent px-4 text-[2rem] outline-none"
        />
        <div
          role="group"
          aria-label={t('currency')}
          className="bg-canvas flex shrink-0 gap-0.5 rounded-md p-0.5"
        >
          {(['USD', 'VES'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCurrencyChange(c)}
              aria-pressed={currency === c}
              className={cn(
                'text-caption h-8 w-11 rounded font-medium transition-colors',
                currency === c ? 'bg-ink text-canvas' : 'text-sage hover:text-ink',
              )}
            >
              {c === 'USD' ? '$' : 'Bs'}
            </button>
          ))}
        </div>
      </div>

      {currency === 'VES' && (
        <p className="text-caption text-sage">
          <span className="tabular">≈ {formatMoney(usd)}</span>
          {` · ${t('rate')} `}
          <span className="tabular">{formatRate(rate)}</span>
          {` ${t('on')} `}
          <span className="tabular">{formatShortDate(rateDate)}</span>
          {onEditRate && (
            <>
              {' '}
              <button type="button" onClick={onEditRate} className="hover:text-ink underline">
                {t('change')}
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
