'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Pencil, Trash2, PiggyBank, Check, RotateCcw } from 'lucide-react';
import { Card, EmptyState, Button, Caption, Figure, Progress, StatusBadge } from '@/components/ui';
import { formatMoney, formatDayMonth, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AccountOption } from '@/features/transactions/schemas';
import { GoalFormDialog } from './goal-form-dialog';
import { ContributionsDialog } from './contributions-dialog';
import { deleteGoal, setGoalAchieved } from './actions';
import type { GoalRow } from './schemas';

type Props = {
  goals: GoalRow[];
  accounts: AccountOption[];
  today: string;
};

export function GoalsManager({ goals, accounts, today }: Props) {
  const t = useTranslations('goals');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [contribOpen, setContribOpen] = useState(false);
  const [contribId, setContribId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = accounts.length > 0;
  const editing = goals.find((g) => g.id === editId) ?? null;
  const contribGoal = goals.find((g) => g.id === contribId) ?? null;

  function openNew() {
    setEditId(null);
    setFormOpen(true);
  }
  function openEdit(goal: GoalRow) {
    setEditId(goal.id);
    setFormOpen(true);
  }
  function openContrib(goal: GoalRow) {
    setContribId(goal.id);
    setContribOpen(true);
  }
  function remove(goal: GoalRow) {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(() => deleteGoal(goal.id));
  }
  function toggleAchieved(goal: GoalRow) {
    startTransition(() => setGoalAchieved(goal.id, !goal.isAchieved));
  }

  function GoalCard({ goal }: { goal: GoalRow }) {
    const ratio = goal.targetAmount > 0 ? goal.saved / goal.targetAmount : 0;
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink truncate font-medium">{goal.name}</p>
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
            <Figure amount={goal.saved} currency={goal.currency} size="md" tone="reserved" />
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

        <div className="border-line -mx-5 mt-1 -mb-5 flex justify-end gap-1 border-t px-3 py-2">
          <Button size="sm" variant="ghost" onClick={() => openContrib(goal)}>
            <PiggyBank className="size-4" />
            {t('actions.contribute')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleAchieved(goal)}
            disabled={isPending}
            aria-label={goal.isAchieved ? t('actions.reopen') : t('actions.markAchieved')}
            title={goal.isAchieved ? t('actions.reopen') : t('actions.markAchieved')}
          >
            {goal.isAchieved ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(goal)}
            aria-label={t('actions.edit')}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => remove(goal)}
            disabled={isPending}
            aria-label={t('actions.delete')}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end">
        {canCreate ? (
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" />
            {t('new')}
          </Button>
        ) : (
          <Link
            href="/accounts"
            className="rounded-control border-line text-ink hover:bg-surface-2 text-caption inline-flex h-9 items-center gap-2 border px-3 font-medium transition-colors"
          >
            {t('needAccountAction')}
          </Link>
        )}
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            title={canCreate ? t('empty.title') : t('needAccountTitle')}
            description={canCreate ? t('empty.description') : t('needAccount')}
            actionLabel={canCreate ? t('new') : undefined}
            onAction={canCreate ? openNew : undefined}
          />
        </Card>
      ) : (
        <div className={cn('grid gap-3 sm:grid-cols-2')}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        accounts={accounts}
        onSaved={() => setFormOpen(false)}
      />
      <ContributionsDialog
        open={contribOpen}
        onOpenChange={setContribOpen}
        goal={contribGoal}
        defaultDate={today}
      />
    </>
  );
}
