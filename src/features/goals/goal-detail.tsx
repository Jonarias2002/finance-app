'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  Caption,
  Field,
  Input,
  Button,
  Figure,
  Progress,
  StatusBadge,
} from '@/components/ui';
import { formatMoney, formatDayMonth, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { addContribution, deleteContribution } from './actions';
import { CONTRIBUTION_KINDS, type ContributionKind, type GoalRow } from './schemas';

type Props = {
  goal: GoalRow;
  today: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function GoalDetail({ goal, today }: Props) {
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

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  const ratio = goal.targetAmount > 0 ? goal.saved / goal.targetAmount : 0;

  // Saldo acumulado después de cada movimiento (cronológico). `contributions`
  // viene del más reciente al más antiguo; acumulamos al revés y guardamos por id.
  const balanceAfter = new Map<string, number>();
  let cumulative = 0;
  for (const c of [...goal.contributions].reverse()) {
    cumulative += c.amount;
    balanceAfter.set(c.id, round2(Math.max(cumulative, 0)));
  }

  return (
    <>
      <Link
        href="/goals"
        className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('backToGoals')}
      </Link>

      {/* Resumen de la meta */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-section text-ink font-display truncate">{goal.name}</h2>
            <Caption className="line-clamp-1">
              {goal.accountName}
              {goal.targetDate &&
                ` · ${t('by')} ${formatDayMonth(`${goal.targetDate}T12:00:00-04:00`)}`}
            </Caption>
          </div>
          {goal.isAchieved && <StatusBadge status="done" label={t('achieved')} />}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <Caption>{t('saved')}</Caption>
            <Figure amount={goal.saved} currency={goal.currency} size="lg" tone="reserved" />
          </div>
          <span className="text-caption text-sage tabular text-right">
            {formatPercent(ratio)} · {formatMoney(goal.targetAmount, goal.currency)}
          </span>
        </div>

        <Progress
          value={goal.saved}
          max={goal.targetAmount}
          tone={goal.isAchieved ? 'verde' : 'ocre'}
        />

        {!goal.isAchieved && goal.remaining > 0 && (
          <Caption>
            {t('remaining')} {formatMoney(goal.remaining, goal.currency)}
          </Caption>
        )}
      </Card>

      {/* Historial de aportes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contributionHistory')}</CardTitle>
          <Caption>{t('contributionCount', { count: goal.contributions.length })}</Caption>
        </CardHeader>

        {goal.contributions.length === 0 ? (
          <p className="text-caption text-sage py-6 text-center">{t('noContributions')}</p>
        ) : (
          <ul className="border-line divide-y rounded-md border">
            {goal.contributions.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="tabular text-caption text-sage w-14 shrink-0">
                  {formatDayMonth(c.contributedAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <Figure
                    amount={c.amount}
                    currency={goal.currency}
                    size="sm"
                    tone={c.amount < 0 ? 'expense' : 'income'}
                    signed
                  />
                  {c.note && <span className="text-caption text-sage"> · {c.note}</span>}
                </span>
                <span className="tabular text-caption text-sage shrink-0 text-right">
                  {t('saved')} {formatMoney(balanceAfter.get(c.id) ?? 0, goal.currency)}
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

        {/* Nuevo aporte / retiro */}
        <form key={formKey} action={action} className="mt-4 space-y-3">
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
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </Field>
            <Field label={t('contributions.date')} htmlFor="contributedAt">
              <Input
                id="contributedAt"
                name="contributedAt"
                type="date"
                defaultValue={today}
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
      </Card>
    </>
  );
}
