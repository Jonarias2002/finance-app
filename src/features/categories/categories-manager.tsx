'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Card,
  EmptyState,
  Button,
  Tabs,
  Table,
  Th,
  Tr,
  Td,
  Pagination,
  usePagination,
} from '@/components/ui';
import { CategoryFormDialog } from './category-form-dialog';
import { deleteCategory } from './actions';
import { CATEGORY_KINDS, type CategoryKind, type CategoryRow } from './schemas';

type Props = {
  categories: CategoryRow[];
};

export function CategoriesManager({ categories }: Props) {
  const t = useTranslations('categories');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [tab, setTab] = useState<CategoryKind>('income');
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(category: CategoryRow) {
    setEditing(category);
    setOpen(true);
  }
  function remove(category: CategoryRow) {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(() => deleteCategory(category.id));
  }

  // v1: lista plana del tipo activo (ya viene ordenada por nombre).
  const visible = categories.filter((c) => c.kind === tab);
  const paged = usePagination(visible, 10);

  function changeTab(next: CategoryKind) {
    setTab(next);
    paged.setPage(1);
  }

  const tabs = CATEGORY_KINDS.map((k) => ({ value: k, label: t(`groups.${k}`) }));

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Tabs value={tab} tabs={tabs} onChange={changeTab} ariaLabel={t('fields.kind')} />
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          {t('new')}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            actionLabel={t('new')}
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
              {paged.pageItems.map((cat) => (
                <Tr key={cat.id}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="text-ink font-medium">{cat.name}</span>
                      {cat.isSystem && (
                        <span className="text-label text-sage tracking-[0.06em] uppercase">
                          · {t('system')}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(cat)}
                        aria-label={t('actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {!cat.isSystem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(cat)}
                          disabled={isPending}
                          aria-label={t('actions.delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </Card>
      )}

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        category={editing}
        defaultKind={tab}
        onSaved={() => setOpen(false)}
      />
    </>
  );
}
