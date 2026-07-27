'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/ui';
import { AccountsManager } from '@/features/accounts/accounts-manager';
import type { AccountRow, BankOption } from '@/features/accounts/schemas';
import { CategoriesManager } from '@/features/categories/categories-manager';
import type { CategoryRow } from '@/features/categories/schemas';
import { ProductsManager } from '@/features/products/products-manager';
import { StoresManager } from '@/features/products/stores-manager';
import type { CategoryOption, ProductRow, StoreRow } from '@/features/products/schemas';
import { MANAGE_TABS, type ManageTab } from './tabs';

type Props = {
  initialTab: ManageTab;
  accounts: AccountRow[];
  banks: BankOption[];
  categories: CategoryRow[];
  products: ProductRow[];
  stores: StoreRow[];
  productCategories: CategoryOption[];
};

export function ManageTabs({
  initialTab,
  accounts,
  banks,
  categories,
  products,
  stores,
  productCategories,
}: Props) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<ManageTab>(initialTab);

  function changeTab(next: ManageTab) {
    setTab(next);
    // Mantiene el tab en la URL para enlaces y el botón atrás, sin recargar datos.
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }

  const tabs = MANAGE_TABS.map((value) => ({ value, label: t(value) }));

  return (
    <>
      <Tabs value={tab} tabs={tabs} onChange={changeTab} ariaLabel={t('manage')} />

      {tab === 'accounts' && <AccountsManager accounts={accounts} banks={banks} />}
      {tab === 'categories' && <CategoriesManager categories={categories} />}
      {tab === 'products' && <ProductsManager products={products} categories={productCategories} />}
      {tab === 'stores' && <StoresManager stores={stores} />}
    </>
  );
}
