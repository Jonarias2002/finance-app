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
  Pill,
  Figure,
  Progress,
  StatusBadge,
} from '@/components/ui';
import { formatMoney, formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/cn';
import { addPayment, deletePayment } from './actions';
import type { DebtRow } from './schemas';

type Props = {
  debt: DebtRow;
  rate: number;
  today: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function DebtDetail({ debt, rate, today }: Props) {
  const t = useTranslations('debts');
  const [state, action, pending] = useActionState(addPayment, undefined);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const prevOk = useRef(false);

  // Al agregar con éxito, limpia el formulario remontando los inputs.
  useEffect(() => {
    if (state?.ok && !prevOk.current) setFormKey((k) => k + 1);
    prevOk.current = Boolean(state?.ok);
  }, [state]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  const overdue = !debt.isSettled && debt.dueDate !== null && debt.dueDate < today;
  const headline = debt.isSettled ? debt.principal : debt.remaining;

  // Saldo restante después de cada abono (cronológico). `payments` viene del más
  // reciente al más antiguo, así que acumulamos al revés y guardamos por id.
  const balanceAfter = new Map<string, number>();
  let cumulative = 0;
  for (const p of [...debt.payments].reverse()) {
    cumulative += p.amount;
    balanceAfter.set(p.id, round2(Math.max(debt.principal - cumulative, 0)));
  }

  return (
    <>
      <Link
        href="/debts"
        className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('backToDebts')}
      </Link>

      {/* Resumen de la deuda */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-section text-ink font-display truncate">{debt.counterparty}</h2>
              <Pill>{t(`groups.${debt.direction}`)}</Pill>
            </div>
            {debt.description && <Caption className="line-clamp-2">{debt.description}</Caption>}
          </div>
          {debt.isSettled && <StatusBadge status="done" label={t('settled')} />}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <Caption>{debt.isSettled ? t('total') : t('remaining')}</Caption>
            <Figure
              amount={headline}
              currency={debt.currency}
              size="lg"
              tone={debt.direction === 'owed_to_me' ? 'income' : 'ink'}
            />
            {debt.currency === 'VES' && rate > 0 && (
              <span className="tabular text-caption text-sage">
                ≈ {formatMoney(headline / rate)}
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
      </Card>

      {/* Historial de abonos */}
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentHistory')}</CardTitle>
          <Caption>{t('paymentCount', { count: debt.payments.length })}</Caption>
        </CardHeader>

        {debt.payments.length === 0 ? (
          <p className="text-caption text-sage py-6 text-center">{t('noPayments')}</p>
        ) : (
          <ul className="border-line divide-y rounded-md border">
            {debt.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="tabular text-caption text-sage w-14 shrink-0">
                  {formatDayMonth(p.paidAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <Figure amount={p.amount} currency={debt.currency} size="sm" tone="income" />
                  {p.note && <span className="text-caption text-sage"> · {p.note}</span>}
                </span>
                <span className="tabular text-caption text-sage shrink-0 text-right">
                  {t('remaining')} {formatMoney(balanceAfter.get(p.id) ?? 0, debt.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => deletePayment(p.id))}
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

        {/* Nuevo abono */}
        {!debt.isSettled && (
          <form key={formKey} action={action} className="mt-4 space-y-3">
            <input type="hidden" name="debtId" value={debt.id} />
            <div className="grid grid-cols-[1fr_9rem] gap-3">
              <Field
                label={`${t('payments.amount')} (${debt.currency})`}
                htmlFor="amount"
                error={err('amount')}
              >
                <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
              </Field>
              <Field label={t('payments.date')} htmlFor="paidAt">
                <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
              </Field>
            </div>
            <Field label={t('payments.note')} htmlFor="note">
              <Input
                id="note"
                name="note"
                maxLength={200}
                placeholder={t('payments.notePlaceholder')}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {t('payments.add')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
