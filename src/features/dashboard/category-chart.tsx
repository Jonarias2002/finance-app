import { formatMoney, formatPercent } from '@/lib/format';

export type CategorySlice = { name: string; amount: number };

/** Gastos por categoría: magnitud de una sola serie → barras horizontales, un tono. */
export function CategoryChart({ items, total }: { items: CategorySlice[]; total: number }) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="text-caption mb-1 flex items-baseline justify-between gap-3">
            <span className="text-ink min-w-0 truncate">{item.name}</span>
            <span className="text-sage tabular shrink-0">
              {formatMoney(item.amount)}
              {total > 0 && <span className="ml-1.5">{formatPercent(item.amount / total)}</span>}
            </span>
          </div>
          <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-ink h-full rounded-full"
              style={{ width: `${(item.amount / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
