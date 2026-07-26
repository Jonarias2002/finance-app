'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Button, Figure } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatMoney, formatDayMonth } from '@/lib/format';
import { addContribution, deleteContribution } from './actions';
import { CONTRIBUTION_KINDS, type ContributionKind, type GoalRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalRow | null;
  defaultDate: string;
};

export function ContributionsDialog({ open, onOpenChange, goal, defaultDate }: Props) {
  const t = useTranslations('goals');
  const [state, action, pending] = useActionState(addContribution, undefined);
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<ContributionKind>('add');
  const [formKey, setFormKey] = useState(0);
  const prevOk = useRef(false);

  useEffect(() => {
    if (state?.ok && !prevOk.current) {
      setFormKey((k) => k + 1);
      setKind('add');
    }
    prevOk.current = Boolean(state?.ok);
  }, [state]);

  if (!goal) return null;

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('contributions.title')}</DialogTitle>
          <DialogDescription>
            {goal.name} · {t('saved')}{' '}
            <span className="tabular">{formatMoney(goal.saved, goal.currency)}</span> {t('of')}{' '}
            <span className="tabular">{formatMoney(goal.targetAmount, goal.currency)}</span>
          </DialogDescription>
        </DialogHeader>

        {goal.contributions.length > 0 && (
          <ul className="border-line max-h-48 divide-y overflow-y-auto rounded-md border">
            {goal.contributions.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <span className="tabular text-caption text-sage w-14 shrink-0">
                  {formatDayMonth(c.contributedAt)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <Figure
                    amount={c.amount}
                    currency={goal.currency}
                    size="sm"
                    tone={c.amount < 0 ? 'expense' : 'income'}
                    signed
                  />
                  {c.note && <span className="text-caption text-sage"> · {c.note}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteContribution(c.id))}
                  disabled={isPending}
                  aria-label={t('actions.delete')}
                  className="text-sage hover:text-ladrillo shrink-0 rounded p-1 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form key={formKey} action={action} className="space-y-3">
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="kind" value={kind} />

          <div
            role="radiogroup"
            aria-label={t('contributions.kind')}
            className="grid grid-cols-2 gap-2"
          >
            {CONTRIBUTION_KINDS.map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(k)}
                  className={cn(
                    'rounded-control text-caption h-10 border font-medium transition-colors',
                    active
                      ? k === 'add'
                        ? 'border-verde text-verde bg-verde/5'
                        : 'border-ocre text-ocre bg-ocre/5'
                      : 'border-line text-sage hover:text-ink',
                  )}
                >
                  {t(`contributions.${k}`)}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_9rem] gap-3">
            <Field
              label={`${t('contributions.amount')} (${goal.currency})`}
              htmlFor="amount"
              error={err('amount')}
            >
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </Field>
            <Field label={t('contributions.date')} htmlFor="contributedAt">
              <Input
                id="contributedAt"
                name="contributedAt"
                type="date"
                defaultValue={defaultDate}
                required
              />
            </Field>
          </div>

          <Field label={t('contributions.note')} htmlFor="note">
            <Input
              id="note"
              name="note"
              maxLength={200}
              placeholder={t('contributions.notePlaceholder')}
            />
          </Field>

          {state?.error && (
            <p className="text-caption text-ladrillo">{t(`errors.${state.error}`)}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {t('contributions.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
