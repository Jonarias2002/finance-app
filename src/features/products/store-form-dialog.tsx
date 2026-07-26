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
import { Field, Input, Button, Alert } from '@/components/ui';
import { saveStore } from './actions';
import type { StoreRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreRow | null;
  onSaved: () => void;
};

export function StoreFormDialog(props: Props) {
  const t = useTranslations('products');
  const { open, onOpenChange, store } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{store ? t('editStore') : t('newStore')}</DialogTitle>
        </DialogHeader>
        <StoreForm key={store?.id ?? 'new'} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function StoreForm({ onOpenChange, store, onSaved }: Props) {
  const t = useTranslations('products');
  const [state, action, pending] = useActionState(saveStore, undefined);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = state?.fieldErrors?.name ? t(`errors.${state.fieldErrors.name}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {store && <input type="hidden" name="id" value={store.id} />}
      <Field label={t('fields.name')} htmlFor="name" required error={err}>
        <Input
          id="name"
          name="name"
          defaultValue={store?.name}
          placeholder={t('storePlaceholder')}
          maxLength={60}
          autoFocus
          required
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
