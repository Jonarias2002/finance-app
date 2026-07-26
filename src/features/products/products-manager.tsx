'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Card,
  EmptyState,
  Button,
  Pill,
  Tabs,
  Table,
  Th,
  Tr,
  Td,
  Pagination,
  usePagination,
} from '@/components/ui';
import { ProductFormDialog } from './product-form-dialog';
import { StoreFormDialog } from './store-form-dialog';
import { deleteProduct, deleteStore } from './actions';
import type { CategoryOption, ProductRow, StoreRow } from './schemas';

type Tab = 'products' | 'stores';

export function ProductsManager({
  products,
  stores,
  categories,
}: {
  products: ProductRow[];
  stores: StoreRow[];
  categories: CategoryOption[];
}) {
  const t = useTranslations('products');
  const [tab, setTab] = useState<Tab>('products');
  const [productOpen, setProductOpen] = useState(false);
  const [productEditing, setProductEditing] = useState<ProductRow | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeEditing, setStoreEditing] = useState<StoreRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const prodPage = usePagination(products, 10);
  const storePage = usePagination(stores, 10);

  function changeTab(next: Tab) {
    setTab(next);
    prodPage.setPage(1);
    storePage.setPage(1);
  }

  function openNewProduct() {
    setProductEditing(null);
    setProductOpen(true);
  }
  function openNewStore() {
    setStoreEditing(null);
    setStoreOpen(true);
  }
  function removeProduct(p: ProductRow) {
    if (!confirm(t('deleteProductConfirm'))) return;
    startTransition(() => deleteProduct(p.id));
  }
  function removeStore(s: StoreRow) {
    if (!confirm(t('deleteStoreConfirm'))) return;
    startTransition(() => deleteStore(s.id));
  }

  const tabs = [
    { value: 'products' as const, label: t('tabs.products') },
    { value: 'stores' as const, label: t('tabs.stores') },
  ];

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Tabs value={tab} tabs={tabs} onChange={changeTab} ariaLabel={t('tabs.products')} />
        {tab === 'products' ? (
          <Button size="sm" onClick={openNewProduct}>
            <Plus className="size-4" />
            {t('newProduct')}
          </Button>
        ) : (
          <Button size="sm" onClick={openNewStore}>
            <Plus className="size-4" />
            {t('newStore')}
          </Button>
        )}
      </div>

      {tab === 'products' ? (
        products.length === 0 ? (
          <Card>
            <EmptyState
              title={t('empty.title')}
              description={t('empty.description')}
              actionLabel={t('newProduct')}
              onAction={openNewProduct}
            />
          </Card>
        ) : (
          <Card className="pt-4">
            <Table>
              <thead>
                <tr>
                  <Th>{t('fields.name')}</Th>
                  <Th>{t('fields.category')}</Th>
                  <Th align="right">
                    <span className="sr-only">{t('actions.edit')}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {prodPage.pageItems.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 font-medium">
                          <Link href={`/products/${p.id}`} className="text-ink hover:underline">
                            {p.name}
                          </Link>
                          {p.isStaple && <Pill>{t('staple')}</Pill>}
                        </span>
                        <span className="text-caption text-sage">
                          {t(`units.${p.unit}`)}
                          {p.typicalDays ? ` · ${t('everyDays', { count: p.typicalDays })}` : ''}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {p.defaultCategoryName ? (
                        <Pill>{p.defaultCategoryName}</Pill>
                      ) : (
                        <span className="text-caption text-sage">—</span>
                      )}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setProductEditing(p);
                            setProductOpen(true);
                          }}
                          aria-label={t('actions.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProduct(p)}
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
              page={prodPage.page}
              pageCount={prodPage.pageCount}
              onPageChange={prodPage.setPage}
            />
          </Card>
        )
      ) : stores.length === 0 ? (
        <Card>
          <EmptyState
            title={t('storesEmpty.title')}
            description={t('storesEmpty.description')}
            actionLabel={t('newStore')}
            onAction={openNewStore}
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
              {storePage.pageItems.map((s) => (
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
                          setStoreEditing(s);
                          setStoreOpen(true);
                        }}
                        aria-label={t('actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStore(s)}
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
          <Pagination
            page={storePage.page}
            pageCount={storePage.pageCount}
            onPageChange={storePage.setPage}
          />
        </Card>
      )}

      <ProductFormDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        product={productEditing}
        categories={categories}
        onSaved={() => setProductOpen(false)}
      />
      <StoreFormDialog
        open={storeOpen}
        onOpenChange={setStoreOpen}
        store={storeEditing}
        onSaved={() => setStoreOpen(false)}
      />
    </>
  );
}
