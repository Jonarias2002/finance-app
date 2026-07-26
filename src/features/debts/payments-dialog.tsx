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
import { formatMoney, formatDayMonth } from '@/lib/format';
import { addPayment, deletePayment } from './actions';
import type { DebtRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtRow | null;
  defaultDate: string;
};

export function PaymentsDialog({ open, onOpenChange, debt, defaultDate }: Props) {
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
        <form key={formKey} action={action} className="space-y-3">
          <input type="hidden" name="debtId" value={debt.id} />
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
                required
                autoFocus
              />
            </Field>
            <Field label={t('payments.date')} htmlFor="paidAt">
              <Input id="paidAt" name="paidAt" type="date" defaultValue={defaultDate} required />
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
      </DialogContent>
    </Dialog>
  );
}
