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
import { saveProduct } from './actions';
import { PRODUCT_UNITS, type CategoryOption, type ProductRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  categories: CategoryOption[];
  onSaved: () => void;
};

export function ProductFormDialog(props: Props) {
  const t = useTranslations('products');
  const { open, onOpenChange, product } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? t('editProduct') : t('newProduct')}</DialogTitle>
        </DialogHeader>
        <ProductForm key={product?.id ?? 'new'} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({ onOpenChange, product, categories, onSaved }: Props) {
  const t = useTranslations('products');
  const [state, action, pending] = useActionState(saveProduct, undefined);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Field label={t('fields.name')} htmlFor="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          defaultValue={product?.name}
          placeholder={t('productPlaceholder')}
          maxLength={60}
          autoFocus
          required
        />
      </Field>

      <Field label={t('fields.category')} htmlFor="defaultCategoryId">
        <Select
          id="defaultCategoryId"
          name="defaultCategoryId"
          defaultValue={product?.defaultCategoryId ?? ''}
        >
          <option value="">{t('noCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('fields.unit')} htmlFor="unit">
        <Select id="unit" name="unit" defaultValue={product?.unit ?? 'unit'}>
          {PRODUCT_UNITS.map((u) => (
            <option key={u} value={u}>
              {t(`units.${u}`)}
            </option>
          ))}
        </Select>
      </Field>

      <label className="text-body text-ink flex items-center gap-2">
        <input
          type="checkbox"
          name="isStaple"
          defaultChecked={product?.isStaple ?? false}
          className="accent-ink size-4"
        />
        {t('fields.staple')}
      </label>

      <Field label={t('fields.typicalDays')} htmlFor="typicalDays" hint={t('typicalDaysHint')}>
        <Input
          id="typicalDays"
          name="typicalDays"
          type="number"
          min="1"
          defaultValue={product?.typicalDays ?? ''}
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
