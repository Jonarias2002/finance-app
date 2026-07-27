'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  EmptyState,
  Button,
  Pill,
  Figure,
  Tabs,
  Table,
  Th,
  Tr,
  Td,
  Input,
  Pagination,
  usePagination,
} from '@/components/ui';
import { formatMoney, formatDayMonth } from '@/lib/format';
import { deleteTransaction } from './actions';
import { TransactionFormDialog } from './transaction-form-dialog';
import type { AccountOption, CategoryOption, ProductOption, TxnRow, TxnType } from './schemas';
import type { RatePoint } from '@/features/exchange-rates/rate-history';

type Filter = 'all' | TxnType;

type Props = {
  transactions: TxnRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  products: ProductOption[];
  rateHistory: RatePoint[];
  today: string;
};

export function TransactionsManager({
  transactions,
  accounts,
  categories,
  products,
  rateHistory,
  today,
}: Props) {
  const t = useTranslations('transactions');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TxnRow | null>(null);
  const [tab, setTab] = useState<Filter>('all');
  const [isPending, startTransition] = useTransition();

  // Filtro por rango de fechas. El día se compara en la zona de Caracas para que
  // coincida con lo que ve el usuario.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }),
    [],
  );
  const inRange = (iso: string) => {
    const d = dateFmt.format(new Date(iso));
    return (!from || d >= from) && (!to || d <= to);
  };

  const byType =
    tab === 'income' || tab === 'expense'
      ? transactions.filter((x) => x.type === tab)
      : transactions;
  const ledgerRows = byType.filter((x) => inRange(x.occurredAt));
  const ledger = usePagination(ledgerRows, 10);

  function changeTab(next: Filter) {
    setTab(next);
    ledger.setPage(1);
  }
  function changeFrom(v: string) {
    setFrom(v);
    ledger.setPage(1);
  }
  function changeTo(v: string) {
    setTo(v);
    ledger.setPage(1);
  }
  function clearDates() {
    setFrom('');
    setTo('');
    ledger.setPage(1);
  }

  const filterTabs = [
    { value: 'all' as const, label: t('filters.all') },
    { value: 'income' as const, label: t('filters.income') },
    { value: 'expense' as const, label: t('filters.expense') },
  ];
  // Un movimiento nuevo hereda el tipo de la pestaña activa (salvo en "Todos").
  const defaultType: TxnType = tab === 'income' ? 'income' : 'expense';

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(txn: TxnRow) {
    setEditing(txn);
    setOpen(true);
  }

  function remove(txn: TxnRow) {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(() => deleteTransaction(txn.id));
  }

  const canCreate = accounts.length > 0;

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        {transactions.length > 0 ? (
          <Tabs value={tab} tabs={filterTabs} onChange={changeTab} ariaLabel={t('fields.type')} />
        ) : (
          <span />
        )}
        {canCreate ? (
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" />
            {t('new')}
          </Button>
        ) : (
          <Link
            href="/manage?tab=accounts"
            className="rounded-control border-line text-ink hover:bg-surface-2 text-caption inline-flex h-9 items-center gap-2 border px-3 font-medium transition-colors"
          >
            {t('needAccount.action')}
          </Link>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="from" className="text-label text-sage">
              {t('dateFilter.from')}
            </label>
            <Input
              id="from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => changeFrom(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to" className="text-label text-sage">
              {t('dateFilter.to')}
            </label>
            <Input
              id="to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => changeTo(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          {(from || to) && (
            <Button variant="ghost" size="sm" onClick={clearDates}>
              {t('dateFilter.clear')}
            </Button>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            title={canCreate ? t('empty.title') : t('needAccount.title')}
            description={canCreate ? t('empty.description') : t('needAccount.description')}
            actionLabel={canCreate ? t('new') : undefined}
            onAction={canCreate ? openNew : undefined}
          />
        </Card>
      ) : ledgerRows.length === 0 ? (
        <Card>
          <p className="text-caption text-sage py-6 text-center">{t('emptyTab')}</p>
        </Card>
      ) : (
        <Card className="pt-4">
          <Table>
            <thead>
              <tr>
                <Th>{t('fields.date')}</Th>
                <Th>{t('fields.description')}</Th>
                <Th>{t('fields.category')}</Th>
                <Th>{t('fields.account')}</Th>
                <Th align="right">{t('fields.amount')}</Th>
                <Th align="right">
                  <span className="sr-only">{t('actions.edit')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {ledger.pageItems.map((txn) => (
                <Tr key={txn.id}>
                  <Td>
                    <span className="tabular text-sage text-caption">
                      {formatDayMonth(txn.occurredAt)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-ink">{txn.description}</span>
                  </Td>
                  <Td>
                    {txn.categoryName ? (
                      <Pill>{txn.categoryName}</Pill>
                    ) : (
                      <span className="text-caption text-sage">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-caption text-sage">{txn.accountName}</span>
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end">
                      {txn.type === 'transfer' ? (
                        <Figure
                          amount={txn.amount}
                          currency={txn.currency}
                          size="sm"
                          tone="muted"
                        />
                      ) : (
                        <Figure
                          amount={txn.type === 'expense' ? -txn.amount : txn.amount}
                          currency={txn.currency}
                          size="sm"
                          tone={txn.type === 'income' ? 'income' : 'expense'}
                          signed
                        />
                      )}
                      {txn.currency === 'VES' && (
                        <span className="tabular text-caption text-sage">
                          ≈ {formatMoney(txn.amountUsd)}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(txn)}
                        aria-label={t('actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(txn)}
                        disabled={isPending}
                        aria-label={t('actions.delete')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={ledger.page}
            pageCount={ledger.pageCount}
            onPageChange={ledger.setPage}
          />
        </Card>
      )}

      {canCreate && (
        <TransactionFormDialog
          open={open}
          onOpenChange={setOpen}
          transaction={editing}
          accounts={accounts}
          categories={categories}
          products={products}
          rateHistory={rateHistory}
          defaultDate={today}
          defaultType={defaultType}
          onSaved={() => setOpen(false)}
        />
      )}
    </>
  );
}
