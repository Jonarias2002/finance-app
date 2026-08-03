'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, HandCoins, Check, RotateCcw, ScrollText } from 'lucide-react';
import {
  Card,
  EmptyState,
  Button,
  Caption,
  Figure,
  Progress,
  StatusBadge,
  Tabs,
} from '@/components/ui';
import { formatMoney, formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/cn';
import { DebtFormDialog } from './debt-form-dialog';
import { PaymentsDialog } from './payments-dialog';
import { deleteDebt, setDebtSettled } from './actions';
import { DEBT_DIRECTIONS, type DebtDirection, type DebtRow } from './schemas';
import type { AccountOption } from '@/features/transactions/schemas';

type PaymentsIntent = 'payment' | 'settle';

type Props = {
  debts: DebtRow[];
  accounts: AccountOption[];
  rate: number;
  today: string;
};

export function DebtsManager({ debts, accounts, rate, today }: Props) {
  const t = useTranslations('debts');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<DebtDirection>('i_owe');
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsId, setPaymentsId] = useState<string | null>(null);
  const [intent, setIntent] = useState<PaymentsIntent>('payment');
  const [isPending, startTransition] = useTransition();

  // Derivar de la lista fresca (tras revalidar) evita mostrar datos obsoletos.
  const editing = debts.find((d) => d.id === editId) ?? null;
  const paymentsDebt = debts.find((d) => d.id === paymentsId) ?? null;

  function openNew() {
    setEditId(null);
    setFormOpen(true);
  }
  function openEdit(debt: DebtRow) {
    setEditId(debt.id);
    setFormOpen(true);
  }
  function openPayments(debt: DebtRow, next: PaymentsIntent = 'payment') {
    setPaymentsId(debt.id);
    setIntent(next);
    setPaymentsOpen(true);
  }
  function remove(debt: DebtRow) {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(() => deleteDebt(debt.id));
  }
  /**
   * Saldar una deuda que aún debe algo no es solo un flag: o pagaste el resto —y
   * eso es un movimiento— o la estás cerrando sin pagar. En vez de decidirlo por
   * el usuario, se abre el diálogo con las dos salidas a la vista. Reabrir y
   * cerrar una deuda ya cubierta sí son cambios de estado y nada más.
   */
  function toggleSettled(debt: DebtRow) {
    if (!debt.isSettled && debt.remaining > 0) {
      openPayments(debt, 'settle');
      return;
    }
    startTransition(() => setDebtSettled(debt.id, !debt.isSettled));
  }

  function DebtCard({ debt }: { debt: DebtRow }) {
    const overdue = !debt.isSettled && debt.dueDate !== null && debt.dueDate < today;
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/debts/${debt.id}`}
              className="text-ink truncate font-medium hover:underline"
            >
              {debt.counterparty}
            </Link>
            {debt.description && <Caption className="line-clamp-1">{debt.description}</Caption>}
          </div>
          {debt.isSettled && <StatusBadge status="done" label={t('settled')} />}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <Caption>{debt.isSettled ? t('total') : t('remaining')}</Caption>
            <Figure
              amount={debt.isSettled ? debt.principal : debt.remaining}
              currency={debt.currency}
              size="md"
              tone={debt.direction === 'owed_to_me' ? 'income' : 'ink'}
            />
            {debt.currency === 'VES' && rate > 0 && (
              <span className="tabular text-caption text-sage">
                ≈ {formatMoney((debt.isSettled ? debt.principal : debt.remaining) / rate)}
              </span>
            )}
          </div>
          <span className="text-caption text-sage tabular text-right">
            {formatMoney(debt.paid, debt.currency)} / {formatMoney(debt.principal, debt.currency)}
          </span>
        </div>

        <Progress value={debt.paid} max={debt.principal} tone={debt.isSettled ? 'verde' : 'ink'} />

        {debt.dueDate && (
          <Caption className={cn(overdue && 'text-ladrillo font-medium')}>
            {t('due')} {formatDayMonth(`${debt.dueDate}T12:00:00-04:00`)}
            {overdue && ` · ${t('overdue')}`}
          </Caption>
        )}

        <div className="border-line -mx-5 mt-1 -mb-5 flex justify-end gap-1 border-t px-3 py-2">
          <Link
            href={`/debts/${debt.id}`}
            className="rounded-control text-sage hover:bg-surface-2 hover:text-ink text-caption inline-flex h-9 items-center justify-center gap-2 px-3 font-medium transition-colors"
          >
            <ScrollText className="size-4" />
            {t('actions.detail')}
          </Link>
          {!debt.isSettled && (
            <Button size="sm" variant="ghost" onClick={() => openPayments(debt)}>
              <HandCoins className="size-4" />
              {t('actions.addPayment')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleSettled(debt)}
            disabled={isPending}
            aria-label={debt.isSettled ? t('actions.reopen') : t('actions.settle')}
            title={debt.isSettled ? t('actions.reopen') : t('actions.settle')}
          >
            {debt.isSettled ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(debt)}
            aria-label={t('actions.edit')}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => remove(debt)}
            disabled={isPending}
            aria-label={t('actions.delete')}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  const group = debts.filter((d) => d.direction === tab);
  const tabs = DEBT_DIRECTIONS.map((dir) => ({ value: dir, label: t(`groups.${dir}`) }));

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Tabs value={tab} tabs={tabs} onChange={setTab} ariaLabel={t('fields.direction')} />
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          {t('new')}
        </Button>
      </div>

      {group.length === 0 ? (
        <Card>
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            actionLabel={t('new')}
            onAction={openNew}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {group.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}

      <DebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        debt={editing}
        defaultDirection={tab}
        onSaved={() => setFormOpen(false)}
      />
      <PaymentsDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        debt={paymentsDebt}
        accounts={accounts}
        defaultDate={today}
        intent={intent}
      />
    </>
  );
}
