import { cn } from '@/lib/cn';
import { formatMoney, formatSigned, type Currency } from '@/lib/format';

type Size = 'lg' | 'md' | 'sm';
type Tone = 'ink' | 'income' | 'expense' | 'reserved' | 'muted';

const SIZE: Record<Size, string> = {
  lg: 'text-fig-lg',
  md: 'text-fig-md',
  sm: 'text-fig-sm',
};

const TONE: Record<Tone, string> = {
  ink: 'text-ink',
  income: 'text-verde',
  expense: 'text-ladrillo',
  reserved: 'text-ocre',
  muted: 'text-sage',
};

type FigureProps = {
  amount: number;
  currency?: Currency;
  size?: Size;
  tone?: Tone;
  /** Antepone + o −. Úsalo en listas de movimientos. */
  signed?: boolean;
  className?: string;
};

/**
 * Toda cifra monetaria de la app pasa por aquí.
 * Garantiza monoespaciada, cifras tabulares y formato es-VE.
 */
export function Figure({
  amount,
  currency = 'USD',
  size = 'md',
  tone = 'ink',
  signed = false,
  className,
}: FigureProps) {
  return (
    <span className={cn('tabular', SIZE[size], TONE[tone], className)}>
      {signed ? formatSigned(amount, currency) : formatMoney(amount, currency)}
    </span>
  );
}
