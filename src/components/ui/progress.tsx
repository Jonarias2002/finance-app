import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';

type ProgressProps = {
  value: number;
  max: number;
  /** ocre para metas, ink para gastos fijos, verde cuando está cumplida. */
  tone?: 'ocre' | 'ink' | 'verde';
  showPercent?: boolean;
  className?: string;
  label?: string;
};

const TONE = { ocre: 'bg-ocre', ink: 'bg-ink', verde: 'bg-verde' };

export function Progress({
  value,
  max,
  tone = 'ocre',
  showPercent = false,
  label,
  className,
}: ProgressProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="bg-line h-1.5 flex-1 overflow-hidden rounded-full"
      >
        <div
          className={cn('h-full rounded-full', TONE[tone])}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {showPercent && <span className="tabular text-fig-sm text-sage">{formatPercent(ratio)}</span>}
    </div>
  );
}
