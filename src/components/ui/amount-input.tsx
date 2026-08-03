'use client';

import { useLayoutEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import {
  completeAmountInput,
  formatAmountInput,
  formatMoney,
  formatRate,
  formatShortDate,
  type Currency,
} from '@/lib/format';

/**
 * Posición del cursor tras dar formato: la misma cantidad de caracteres
 * significativos (dígitos y coma) que había antes de él. Sin esto, meter un punto
 * de miles empuja el cursor y se acaba escribiendo al revés.
 */
function caretAfter(formatted: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d,]/.test(formatted.charAt(i))) seen += 1;
    if (seen === significant) return i + 1;
  }
  return formatted.length;
}

const countSignificant = (text: string) => (text.match(/[\d,]/g) ?? []).length;

type AmountInputProps = {
  value: string;
  /** Moneda en la que se teclea el monto. La elige el usuario, libremente. */
  currency: Currency;
  /** Moneda de la cuenta: a esta se convierte y es la que mueve el saldo. */
  accountCurrency: Currency;
  /** Bolívares por 1 USD, tomada de la tabla exchange_rates. */
  rate: number;
  /** Nombre de la fuente que se está usando: "BCV", "Paralelo", "Manual". */
  rateName: string;
  rateDate: Date | string;
  onValueChange: (value: string) => void;
  onCurrencyChange: (currency: Currency) => void;
};

/**
 * El control más grande de cualquier formulario.
 * Convierte en vivo bolívares a dólares con la tasa del día.
 */
export function AmountInput({
  value,
  currency,
  accountCurrency,
  rate,
  rateName,
  rateDate,
  onValueChange,
  onCurrencyChange,
}: AmountInputProps) {
  const t = useTranslations('amountInput');
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  // Reponer el cursor después de que React repinte con el valor ya formateado.
  useLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const significant = countSignificant(el.value.slice(0, caret));
    const formatted = formatAmountInput(el.value);
    caretRef.current = caretAfter(formatted, significant);
    onValueChange(formatted);
  }

  const numeric = Number(value.replace(/\./g, '').replace(',', '.')) || 0;
  // Equivalente que se muestra: en bolívares, siempre su valor en dólares (el
  // canónico); en dólares con cuenta en bolívares, lo que entrará a esa cuenta.
  const equivalent: { currency: Currency; amount: number } | null =
    currency === 'VES'
      ? { currency: 'USD', amount: numeric / rate }
      : accountCurrency === 'VES'
        ? { currency: 'VES', amount: numeric * rate }
        : null;

  return (
    <div className="space-y-2">
      <div className="rounded-control border-line bg-surface focus-within:border-line-strong flex items-center border pr-2">
        <input
          ref={inputRef}
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          // Al salir se completan los decimales: "1.284" queda "1.284,00".
          onBlur={() => onValueChange(completeAmountInput(value))}
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

      {/* La tasa se ve siempre que exista, también con cuentas en dólares: allí no
          convierte nada (el servidor guarda tasa 1), pero es la referencia del día
          que el usuario espera ver al registrar. El nombre de la fuente va delante
          para que nunca haya duda de cuál se está aplicando. */}
      {(equivalent || rate > 0) && (
        <p className="text-caption text-sage">
          {equivalent && (
            <>
              <span className="tabular">
                ≈ {formatMoney(equivalent.amount, equivalent.currency)}
              </span>
              {' · '}
            </>
          )}
          {`${rateName} `}
          <span className="tabular">{formatRate(rate)}</span>
          {` ${t('on')} `}
          <span className="tabular">{formatShortDate(rateDate)}</span>
        </p>
      )}
    </div>
  );
}
