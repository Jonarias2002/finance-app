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
import { Field, Input, Button, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { saveCategory } from './actions';
import { CATEGORY_KINDS, type CategoryKind, type CategoryRow } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  /** Tipo por defecto al crear (según la sección desde la que se abrió). */
  defaultKind: CategoryKind;
  onSaved: () => void;
};

export function CategoryFormDialog({ open, onOpenChange, category, defaultKind, onSaved }: Props) {
  const t = useTranslations('categories');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <CategoryForm
          key={category?.id ?? `new-${defaultKind}`}
          category={category}
          defaultKind={defaultKind}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  defaultKind,
  onCancel,
  onSaved,
}: {
  category: CategoryRow | null;
  defaultKind: CategoryKind;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('categories');
  const [state, action, pending] = useActionState(saveCategory, undefined);
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? defaultKind);
  const [isRecurring, setIsRecurring] = useState<boolean>(category?.isRecurring ?? false);
  const [recurringDay, setRecurringDay] = useState<string>(
    category?.recurringDay ? String(category.recurringDay) : '',
  );

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="kind" value={kind} />

      <Field label={t('fields.name')} htmlFor="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name}
          maxLength={40}
          autoFocus
          required
        />
      </Field>

      <Field label={t('fields.kind')} htmlFor="kind-income">
        <div role="radiogroup" aria-label={t('fields.kind')} className="grid grid-cols-2 gap-2">
          {CATEGORY_KINDS.map((v) => {
            const active = kind === v;
            const activeCls =
              v === 'income'
                ? 'border-verde text-verde bg-verde/5'
                : 'border-ladrillo text-ladrillo bg-ladrillo/5';
            return (
              <button
                key={v}
                id={`kind-${v}`}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setKind(v);
                  if (v !== 'expense') setIsRecurring(false);
                }}
                className={cn(
                  'rounded-control text-caption h-11 border font-medium transition-colors',
                  active ? activeCls : 'border-line text-sage hover:text-ink',
                )}
              >
                {t(`kinds.${v}`)}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Solo para gasto: marcarla como recurrente y su día del mes. */}
      {kind === 'expense' && (
        <div className="border-line space-y-3 border-t pt-4">
          <label className="text-body text-ink flex items-center gap-2">
            <input
              type="checkbox"
              name="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="accent-ink size-4"
            />
            {t('recurring.label')}
          </label>

          {isRecurring && (
            <Field
              label={t('recurring.day')}
              htmlFor="recurringDay"
              hint={t('recurring.dayHint')}
              error={err('recurringDay')}
            >
              <Input
                id="recurringDay"
                name="recurringDay"
                type="number"
                min={1}
                max={31}
                value={recurringDay}
                onChange={(e) => setRecurringDay(e.target.value)}
                className="w-24"
                required
              />
            </Field>
          )}
        </div>
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
        <Button type="submit" disabled={pending || (isRecurring && !recurringDay)}>
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
