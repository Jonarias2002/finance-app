import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Presupuesto que avisa, no bloquea (§16): normal (ink), sobre 85% (ocre),
 * excedido (ladrillo). Sin presupuesto, solo muestra el total.
 */
export function BudgetBar({ total, budget }: { total: number; budget: number | null }) {
  const ratio = budget && budget > 0 ? total / budget : 0;
  const color = ratio > 1 ? 'bg-ladrillo' : ratio > 0.85 ? 'bg-ocre' : 'bg-ink';
  const totalTone = ratio > 1 ? 'text-ladrillo' : 'text-ink';

  return (
    <div className="space-y-1.5">
      <div className="text-caption flex items-baseline justify-between gap-2">
        <span className={cn('tabular font-medium', totalTone)}>{formatMoney(total)}</span>
        {budget != null && <span className="tabular text-sage">/ {formatMoney(budget)}</span>}
      </div>
      {budget != null && (
        <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-all', color)}
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
