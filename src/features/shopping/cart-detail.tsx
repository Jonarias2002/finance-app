'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, ArrowLeft, ShoppingCart, CheckCircle2, PackagePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, Caption, Field, Input, Select, Button, Alert } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { BudgetBar } from './budget-bar';
import {
  addItem,
  addMissingStaples,
  closePurchase,
  deleteItem,
  setItemActual,
  toggleItem,
} from './actions';
import type { AccountOption, ItemRow, ProductOption, ShoppingListRow } from './schemas';

type Props = {
  list: ShoppingListRow;
  items: ItemRow[];
  products: ProductOption[];
  accounts: AccountOption[];
  today: string;
};

export function CartDetail({ list, items, products, accounts, today }: Props) {
  const t = useTranslations('shopping');
  const tUnits = useTranslations('products.units');
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);

  const total = items.reduce((s, it) => s + (it.actualUsd ?? it.estimatedUsd ?? 0), 0);
  const done = list.status === 'completed';

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/shopping"
          className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t('backToLists')}
        </Link>
        {!done && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startTransition(() => addMissingStaples(list.id))}
              disabled={isPending}
            >
              <PackagePlus className="size-4" />
              {t('addMissing')}
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              {t('addItem')}
            </Button>
          </div>
        )}
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-section text-ink font-[family-name:var(--font-bricolage)]">
              {list.name}
            </h2>
            <Caption>{list.storeName ?? t('noStore')}</Caption>
          </div>
          <ShoppingCart className="text-sage size-5" aria-hidden />
        </div>
        <BudgetBar total={total} budget={list.budgetUsd} />
        {list.budgetUsd != null && total > list.budgetUsd && (
          <Caption className="text-ladrillo">
            {t('overBudget', { amount: formatMoney(total - list.budgetUsd) })}
          </Caption>
        )}
      </Card>

      {done && (
        <div className="rounded-control border-verde/40 bg-verde/[0.06] flex items-center gap-3 border p-3 pl-4">
          <CheckCircle2 className="text-verde size-[18px] shrink-0" aria-hidden />
          <p className="text-body text-ink flex-1">{t('completedNote')}</p>
          {list.transactionId && (
            <Link
              href="/transactions"
              className="text-caption text-verde font-medium hover:underline"
            >
              {t('viewTransaction')}
            </Link>
          )}
        </div>
      )}

      <Card className="pt-4">
        {items.length === 0 ? (
          <p className="text-caption text-sage py-6 text-center">{t('noItems')}</p>
        ) : (
          <ul className="divide-line divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={done || isPending}
                  onChange={(e) =>
                    startTransition(() => toggleItem(item.id, list.id, e.target.checked))
                  }
                  className="accent-ink size-4 shrink-0"
                  aria-label={item.name}
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-body',
                      item.checked ? 'text-sage line-through' : 'text-ink',
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="text-caption text-sage ml-2">
                    {item.quantity} {tUnits(item.unit)}
                    {item.estimatedUsd != null && item.actualUsd == null && (
                      <> · ≈ {formatMoney(item.estimatedUsd)}</>
                    )}
                  </span>
                </div>
                {!done && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={item.actualUsd ?? ''}
                    placeholder={t('actualPrice')}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const val = raw === '' ? null : Number(raw);
                      if (val !== item.actualUsd) {
                        startTransition(() => setItemActual(item.id, list.id, val));
                      }
                    }}
                    className="rounded-control border-line bg-surface text-body text-ink tabular h-9 w-24 border px-2 text-right"
                    aria-label={t('actualPrice')}
                  />
                )}
                {done && item.actualUsd != null && (
                  <span className="tabular text-body text-ink w-24 text-right">
                    {formatMoney(item.actualUsd)}
                  </span>
                )}
                {!done && (
                  <button
                    type="button"
                    onClick={() => startTransition(() => deleteItem(item.id, list.id))}
                    disabled={isPending}
                    aria-label={t('deleteItem')}
                    className="text-sage hover:text-ladrillo shrink-0 rounded p-1 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!done && items.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setClosing(true)} disabled={total <= 0}>
            {t('closePurchase')}
          </Button>
        </div>
      )}

      <AddItemDialog open={adding} onOpenChange={setAdding} listId={list.id} products={products} />
      <CloseDialog
        open={closing}
        onOpenChange={setClosing}
        listId={list.id}
        accounts={accounts}
        defaultDate={today}
        total={total}
      />
    </>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  listId,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listId: string;
  products: ProductOption[];
}) {
  const t = useTranslations('shopping');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addItem')}</DialogTitle>
        </DialogHeader>
        <AddItemForm
          key={open ? 'open' : 'closed'}
          listId={listId}
          products={products}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddItemForm({
  listId,
  products,
  onDone,
}: {
  listId: string;
  products: ProductOption[];
  onDone: () => void;
}) {
  const t = useTranslations('shopping');
  const [state, action, pending] = useActionState(addItem, undefined);
  const [productId, setProductId] = useState('');

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listId" value={listId} />

      <Field label={t('fields.product')} htmlFor="productId">
        <Select
          id="productId"
          name="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">{t('adHoc')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      {productId === '' && (
        <Field label={t('fields.itemName')} htmlFor="name" required error={err('name')}>
          <Input
            id="name"
            name="name"
            maxLength={60}
            placeholder={t('itemNamePlaceholder')}
            autoFocus
          />
        </Field>
      )}

      <Field label={t('fields.quantity')} htmlFor="quantity" required error={err('quantity')}>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="0.001"
          min="0"
          defaultValue={1}
          required
        />
      </Field>

      {state?.error && (
        <Alert level="critical" dismissible={false}>
          {t(`errors.${state.error}`)}
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={pending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {t('add')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CloseDialog({
  open,
  onOpenChange,
  listId,
  accounts,
  defaultDate,
  total,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listId: string;
  accounts: AccountOption[];
  defaultDate: string;
  total: number;
}) {
  const t = useTranslations('shopping');
  const router = useRouter();
  const [state, action, pending] = useActionState(closePurchase, undefined);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.push('/shopping');
    }
  }, [state, onOpenChange, router]);

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('closePurchase')}</DialogTitle>
        </DialogHeader>
        {accounts.length === 0 ? (
          <p className="text-body text-sage py-4">{t('needAccount')}</p>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="listId" value={listId} />
            <p className="text-caption text-sage">
              {t('closeSummary', { amount: formatMoney(total) })}
            </p>
            <Field label={t('fields.account')} htmlFor="accountId" error={err('accountId')}>
              <Select id="accountId" name="accountId" defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('fields.date')} htmlFor="occurredAt">
              <Input
                id="occurredAt"
                name="occurredAt"
                type="date"
                defaultValue={defaultDate}
                required
              />
            </Field>
            <p className="text-caption text-sage">{t('autoCategoryHint')}</p>
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
                {t('confirmClose')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
