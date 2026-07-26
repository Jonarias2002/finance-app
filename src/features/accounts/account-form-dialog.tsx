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
import { saveAccount } from './actions';
import { ACCOUNT_TYPES, CURRENCIES, type AccountRow, type BankOption } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cuenta a editar; null para crear una nueva. */
  account: AccountRow | null;
  banks: BankOption[];
  onSaved: () => void;
};

export function AccountFormDialog({ open, onOpenChange, account, banks, onSaved }: Props) {
  const t = useTranslations('accounts');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        {/* Radix remonta el contenido en cada apertura; el key resetea el estado
            local del form al cambiar de cuenta sin necesidad de efectos. */}
        <AccountForm
          key={account?.id ?? 'new'}
          account={account}
          banks={banks}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  banks,
  onCancel,
  onSaved,
}: {
  account: AccountRow | null;
  banks: BankOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('accounts');
  const [state, action, pending] = useActionState(saveAccount, undefined);
  const [type, setType] = useState<string>(account?.type ?? 'cash');

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field label={t('fields.name')} htmlFor="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          defaultValue={account?.name}
          placeholder={t('namePlaceholder')}
          maxLength={60}
          autoFocus
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fields.type')} htmlFor="type">
          <Select
            id="type"
            name="type"
            defaultValue={account?.type ?? 'cash'}
            onChange={(e) => setType(e.target.value)}
          >
            {ACCOUNT_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`types.${v}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('fields.currency')} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={account?.currency ?? 'USD'}>
            {CURRENCIES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {type === 'bank' && (
        <Field label={t('fields.bank')} htmlFor="bankId">
          <Select id="bankId" name="bankId" defaultValue={account?.bankId ?? ''}>
            <option value="">{t('noBank')}</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {state?.error && (
        <Alert level="critical" dismissible={false}>
          {t(`errors.${state.error}`)}
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
