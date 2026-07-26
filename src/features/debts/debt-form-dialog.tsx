'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Select, Button, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { saveDebt } from './actions';
import { CURRENCIES, DEBT_DIRECTIONS, type DebtDirection, type DebtRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtRow | null;
  defaultDirection: DebtDirection;
  onSaved: () => void;
};

export function DebtFormDialog(props: Props) {
  const t = useTranslations('debts');
  const { open, onOpenChange, debt } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{debt ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <DebtForm key={debt?.id ?? `new-${props.defaultDirection}`} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function DebtForm({ onOpenChange, debt, defaultDirection, onSaved }: Props) {
  const t = useTranslations('debts');
  const [state, action, pending] = useActionState(saveDebt, undefined);
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? defaultDirection);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {debt && <input type="hidden" name="id" value={debt.id} />}
      <input type="hidden" name="direction" value={direction} />

      <div role="radiogroup" aria-label={t('fields.direction')} className="grid grid-cols-2 gap-2">
        {DEBT_DIRECTIONS.map((v) => {
          const active = direction === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDirection(v)}
              className={cn(
                'rounded-control text-body h-11 border font-medium transition-colors',
                active
                  ? 'border-ink text-ink bg-surface-2'
                  : 'border-line text-sage hover:text-ink',
              )}
            >
              {t(`groups.${v}`)}
            </button>
          );
        })}
      </div>

      <Field
        label={t('fields.counterparty')}
        htmlFor="counterparty"
        required
        error={err('counterparty')}
      >
        <Input
          id="counterparty"
          name="counterparty"
          defaultValue={debt?.counterparty}
          placeholder={t('counterpartyPlaceholder')}
          maxLength={80}
          autoFocus
          required
        />
      </Field>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label={t('fields.principal')} htmlFor="principal" required error={err('principal')}>
          <Input
            id="principal"
            name="principal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={debt?.principal}
            required
          />
        </Field>
        <Field label={t('fields.currency')} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={debt?.currency ?? 'USD'}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={t('fields.dueDate')} htmlFor="dueDate">
        <Input id="dueDate" name="dueDate" type="date" defaultValue={debt?.dueDate ?? ''} />
      </Field>

      <Field label={t('fields.description')} htmlFor="description">
        <Input
          id="description"
          name="description"
          defaultValue={debt?.description ?? ''}
          placeholder={t('descriptionPlaceholder')}
          maxLength={200}
        />
      </Field>

      {state?.error && (
        <Alert level="critical" dismissible={false}>
          {t(`errors.${state.error}`)}
        </Alert>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
