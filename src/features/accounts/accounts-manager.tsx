'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import {
  Card,
  EmptyState,
  Button,
  Pill,
  Table,
  Th,
  Tr,
  Td,
  Pagination,
  usePagination,
} from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { AccountFormDialog } from './account-form-dialog';
import { setAccountArchived } from './actions';
import type { AccountRow, BankOption } from './schemas';

export function AccountsManager({
  accounts,
  banks,
}: {
  accounts: AccountRow[];
  banks: BankOption[];
}) {
  const t = useTranslations('accounts');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const visible = accounts.filter((a) => showArchived || !a.isArchived);
  const hasArchived = accounts.some((a) => a.isArchived);
  const paged = usePagination(visible, 10);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(account: AccountRow) {
    setEditing(account);
    setOpen(true);
  }

  function toggleArchive(account: AccountRow) {
    startTransition(() => setAccountArchived(account.id, !account.isArchived));
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {hasArchived ? (
          <label className="text-caption text-sage flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                paged.setPage(1);
              }}
              className="accent-ink size-4"
            />
            {t('showArchived')}
          </label>
        ) : (
          <span />
        )}
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
                <Th>{t('fields.type')}</Th>
                <Th align="right">{t('available')}</Th>
                <Th align="right">
                  <span className="sr-only">{t('actions.edit')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((account) => (
                <Tr key={account.id} className={cn(account.isArchived && 'opacity-55')}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="text-ink flex items-center gap-2 font-medium">
                        {account.name}
                        {account.isArchived && (
                          <span className="text-label text-sage tracking-[0.06em] uppercase">
                            · {t('archived')}
                          </span>
                        )}
                      </span>
                      {account.bankName && (
                        <span className="text-caption text-sage">{account.bankName}</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Pill>{t(`types.${account.type}`)}</Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end">
                      <span className="tabular text-ink">
                        {formatMoney(account.available, account.currency)}
                      </span>
                      {account.reserved > 0 && (
                        <span className="text-caption text-ocre">
                          {formatMoney(account.reserved, account.currency)} {t('reserved')}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(account)}
                        aria-label={t('actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleArchive(account)}
                        disabled={isPending}
                        aria-label={
                          account.isArchived ? t('actions.restore') : t('actions.archive')
                        }
                      >
                        {account.isArchived ? (
                          <ArchiveRestore className="size-4" />
                        ) : (
                          <Archive className="size-4" />
                        )}
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

      <AccountFormDialog
        open={open}
        onOpenChange={setOpen}
        account={editing}
        banks={banks}
        onSaved={() => setOpen(false)}
      />
    </>
  );
}
