'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Card, EmptyState, Button, Caption, StatusBadge } from '@/components/ui';
import { ListFormDialog } from './list-form-dialog';
import { BudgetBar } from './budget-bar';
import { deleteList } from './actions';
import type { ShoppingListRow, StoreOption } from './schemas';

export function ShoppingManager({
  lists,
  stores,
}: {
  lists: ShoppingListRow[];
  stores: StoreOption[];
}) {
  const t = useTranslations('shopping');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove(list: ShoppingListRow) {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(() => deleteList(list.id));
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {t('newList')}
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            actionLabel={t('newList')}
            onAction={() => setOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <Card key={list.id} className="flex flex-col gap-3">
              <Link href={`/shopping/${list.id}`} className="group block space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink truncate font-medium group-hover:underline">
                      {list.name}
                    </p>
                    <Caption>{list.storeName ?? t('noStore')}</Caption>
                  </div>
                  {list.status === 'completed' ? (
                    <StatusBadge status="done" label={t('status.completed')} />
                  ) : (
                    <span className="text-label text-sage shrink-0 tracking-[0.06em] uppercase">
                      {t('status.open')}
                    </span>
                  )}
                </div>
                <BudgetBar total={list.total} budget={list.budgetUsd} />
                <Caption>
                  {t('itemsSummary', { count: list.itemCount, checked: list.checkedCount })}
                </Caption>
              </Link>
              <div className="border-line -mx-5 -mb-5 flex items-center justify-between border-t px-3 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(list)}
                  disabled={isPending}
                  aria-label={t('deleteList')}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Link
                  href={`/shopping/${list.id}`}
                  className="text-caption text-sage hover:text-ink inline-flex items-center gap-1 font-medium transition-colors"
                >
                  {t('open')}
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ListFormDialog
        open={open}
        onOpenChange={setOpen}
        list={null}
        stores={stores}
        onSaved={() => setOpen(false)}
      />
    </>
  );
}
