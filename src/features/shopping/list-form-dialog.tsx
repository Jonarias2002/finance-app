'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Select, Button, Alert } from '@/components/ui';
import { saveList } from './actions';
import type { ShoppingListRow, StoreOption } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ShoppingListRow | null;
  stores: StoreOption[];
  onSaved: () => void;
};

export function ListFormDialog(props: Props) {
  const t = useTranslations('shopping');
  const { open, onOpenChange, list } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{list ? t('editList') : t('newList')}</DialogTitle>
        </DialogHeader>
        <ListForm key={list?.id ?? 'new'} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ListForm({ onOpenChange, list, stores, onSaved }: Props) {
  const t = useTranslations('shopping');
  const [state, action, pending] = useActionState(saveList, undefined);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {list && <input type="hidden" name="id" value={list.id} />}

      <Field label={t('fields.name')} htmlFor="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          defaultValue={list?.name}
          placeholder={t('listPlaceholder')}
          maxLength={60}
          autoFocus
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fields.store')} htmlFor="storeId">
          <Select id="storeId" name="storeId" defaultValue={list?.storeId ?? ''}>
            <option value="">{t('noStore')}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('fields.budget')} htmlFor="budgetUsd" hint="USD">
          <Input
            id="budgetUsd"
            name="budgetUsd"
            type="number"
            step="0.01"
            min="0"
            defaultValue={list?.budgetUsd ?? ''}
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
