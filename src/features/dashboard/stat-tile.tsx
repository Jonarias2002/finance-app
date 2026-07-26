import { Card, Label, Figure } from '@/components/ui';
import type { Currency } from '@/lib/format';

type Tone = 'ink' | 'income' | 'expense' | 'reserved' | 'muted';

export function StatTile({
  label,
  amount,
  currency = 'USD',
  tone = 'ink',
  signed = false,
  hint,
}: {
  label: string;
  amount: number;
  currency?: Currency;
  tone?: Tone;
  signed?: boolean;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Figure amount={amount} currency={currency} size="md" tone={tone} signed={signed} />
      {hint && <span className="text-caption text-sage">{hint}</span>}
    </Card>
  );
}
