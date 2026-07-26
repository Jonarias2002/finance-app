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
import type { AccountOption } from '@/features/transactions/schemas';
import { saveGoal } from './actions';
import type { GoalRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalRow | null;
  accounts: AccountOption[];
  onSaved: () => void;
};

export function GoalFormDialog(props: Props) {
  const t = useTranslations('goals');
  const { open, onOpenChange, goal } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <GoalForm key={goal?.id ?? 'new'} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ onOpenChange, goal, accounts, onSaved }: Props) {
  const t = useTranslations('goals');
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const [accountId, setAccountId] = useState<string>(goal?.accountId ?? accounts[0]?.id ?? '');

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const currency = accounts.find((a) => a.id === accountId)?.currency ?? 'USD';
  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  if (accounts.length === 0) {
    return <p className="text-body text-sage py-4">{t('needAccount')}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}

      <Field label={t('fields.name')} htmlFor="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          defaultValue={goal?.name}
          placeholder={t('namePlaceholder')}
          maxLength={80}
          autoFocus
          required
        />
      </Field>

      <Field label={t('fields.account')} htmlFor="accountId" error={err('accountId')}>
        <Select
          id="accountId"
          name="accountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.currency}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <Field
          label={`${t('fields.target')} (${currency})`}
          htmlFor="targetAmount"
          required
          error={err('targetAmount')}
        >
          <Input
            id="targetAmount"
            name="targetAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={goal?.targetAmount}
            required
          />
        </Field>
        <Field label={t('fields.targetDate')} htmlFor="targetDate">
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={goal?.targetDate ?? ''}
          />
        </Field>
      </div>

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
