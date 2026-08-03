'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Receipt, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Select, Button, Figure, Alert } from '@/components/ui';
import { formatMoney, formatDayMonth } from '@/lib/format';
import { addPayment, deletePayment, setDebtSettled } from './actions';
import type { DebtRow } from './schemas';
import type { AccountOption } from '@/features/transactions/schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtRow | null;
  accounts: AccountOption[];
  defaultDate: string;
  /** `settle` lo abre para cerrar la deuda: monto prellenado con lo pendiente. */
  intent?: 'payment' | 'settle';
};

export function PaymentsDialog({
  open,
  onOpenChange,
  debt,
  accounts,
  defaultDate,
  intent = 'payment',
}: Props) {
  const t = useTranslations('debts');
  const [state, action, pending] = useActionState(addPayment, undefined);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const prevOk = useRef(false);

  // Al agregar con éxito: limpia el formulario (remonta los inputs).
  useEffect(() => {
    if (state?.ok && !prevOk.current) setFormKey((k) => k + 1);
    prevOk.current = Boolean(state?.ok);
  }, [state]);

  if (!debt) return null;

  // Cerrar una deuda que ya no debe nada no es un pago: es solo el flag.
  const settling = intent === 'settle' && debt.remaining > 0;

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('payments.title')}</DialogTitle>
          <DialogDescription>
            {debt.counterparty} · {t('remaining')}{' '}
            <span className="tabular">{formatMoney(debt.remaining, debt.currency)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Historial de abonos */}
        {debt.payments.length > 0 && (
          <ul className="border-line max-h-48 divide-y overflow-y-auto rounded-md border">
            {debt.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="tabular text-caption text-sage w-14 shrink-0">
                  {formatDayMonth(p.paidAt)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <Figure amount={p.amount} currency={debt.currency} size="sm" tone="income" />
                  {p.note && <span className="text-caption text-sage"> · {p.note}</span>}
                </span>
                {/* El abono que nació de un movimiento se borra borrando ese
                    movimiento: hacerlo aquí dejaría el gasto sin su efecto en la
                    deuda. Se marca con el enlace al libro en su lugar. */}
                {p.transactionId ? (
                  <Link
                    href="/transactions"
                    title={t('payments.fromTransactionHint')}
                    className="text-sage hover:text-ink shrink-0 rounded p-1 transition-colors"
                    aria-label={t('payments.fromTransaction')}
                  >
                    <Receipt className="size-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startTransition(() => deletePayment(p.id))}
                    disabled={isPending}
                    aria-label={t('actions.delete')}
                    className="text-sage hover:text-ladrillo shrink-0 rounded p-1 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Nuevo abono. Crea también el movimiento: por eso pide cuenta. */}
        {accounts.length === 0 ? (
          <p className="text-body text-sage py-2">{t('payments.needAccount')}</p>
        ) : (
          <form key={formKey} action={action} className="space-y-3">
            <input type="hidden" name="debtId" value={debt.id} />
            {settling && <input type="hidden" name="settle" value="on" />}
            <div className="grid grid-cols-[1fr_9rem] gap-3">
              <Field
                label={`${t('payments.amount')} (${debt.currency})`}
                htmlFor="amount"
                error={err('amount')}
              >
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settling ? debt.remaining : undefined}
                  required
                  autoFocus
                />
              </Field>
              <Field label={t('payments.date')} htmlFor="paidAt">
                <Input id="paidAt" name="paidAt" type="date" defaultValue={defaultDate} required />
              </Field>
            </div>
            <Field
              label={t('payments.account')}
              htmlFor="accountId"
              error={err('accountId')}
              hint={t('payments.accountHint')}
            >
              <Select id="accountId" name="accountId" defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('payments.note')} htmlFor="note">
              <Input
                id="note"
                name="note"
                maxLength={200}
                placeholder={t('payments.notePlaceholder')}
              />
            </Field>
            {state?.error && (
              <Alert level="critical" dismissible={false}>
                {t(`errors.${state.error}`)}
              </Alert>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {/* Cerrar sin pago: la deuda se perdona o ya se pagó fuera de la app.
                  No inventa ningún movimiento, y por eso va como acción secundaria. */}
              {settling && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending || pending}
                  onClick={() => {
                    startTransition(() => setDebtSettled(debt.id, true));
                    onOpenChange(false);
                  }}
                >
                  {t('payments.settleWithoutPayment')}
                </Button>
              )}
              <Button type="submit" disabled={pending}>
                {settling ? t('payments.settleAndPay') : t('payments.add')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
