'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Card,
  EmptyState,
  Button,
  Table,
  Th,
  Tr,
  Td,
  Pagination,
  usePagination,
} from '@/components/ui';
import { StoreFormDialog } from './store-form-dialog';
import { deleteStore } from './actions';
import type { StoreRow } from './schemas';

export function StoresManager({ stores }: { stores: StoreRow[] }) {
  const t = useTranslations('products');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const paged = usePagination(stores, 10);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function remove(s: StoreRow) {
    if (!confirm(t('deleteStoreConfirm'))) return;
    startTransition(() => deleteStore(s.id));
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          {t('newStore')}
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card>
          <EmptyState
            title={t('storesEmpty.title')}
            description={t('storesEmpty.description')}
            actionLabel={t('newStore')}
            onAction={openNew}
          />
        </Card>
      ) : (
        <Card className="pt-4">
          <Table>
            <thead>
              <tr>
                <Th>{t('fields.name')}</Th>
                <Th align="right">
                  <span className="sr-only">{t('actions.edit')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <span className="text-ink font-medium">{s.name}</span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        aria-label={t('actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(s)}
                        disabled={isPending}
                        aria-label={t('deleteStore')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </Card>
      )}

      <StoreFormDialog
        open={open}
        onOpenChange={setOpen}
        store={editing}
        onSaved={() => setOpen(false)}
      />
    </>
  );
}
