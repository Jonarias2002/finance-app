import { z } from 'zod';
import type { Currency } from '@/lib/format';
import type { ProductUnit } from '@/features/products/schemas';

export const SHOPPING_STATUSES = ['draft', 'shopping', 'completed', 'cancelled'] as const;
export type ShoppingStatus = (typeof SHOPPING_STATUSES)[number];

/** Los mensajes son claves i18n de `shopping.errors`. */
export const listSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  storeId: z.uuid().nullable(),
  budgetUsd: z.number().positive().nullable(),
});

export const itemSchema = z
  .object({
    listId: z.uuid(),
    productId: z.uuid().nullable(),
    name: z.string().trim().max(60).nullable(),
    quantity: z.number().positive('quantityRequired'),
  })
  .refine((d) => d.productId !== null || Boolean(d.name), {
    path: ['name'],
    message: 'required',
  });

export const closeSchema = z.object({
  listId: z.uuid(),
  accountId: z.uuid(),
  // La categoría del movimiento NO se elige: se hereda de los productos del
  // carrito (la categoría dominante por monto). Ver closePurchase.
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export type ItemRow = {
  id: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  estimatedUsd: number | null;
  actualUsd: number | null;
  checked: boolean;
};

export type ShoppingListRow = {
  id: string;
  name: string;
  storeId: string | null;
  storeName: string | null;
  budgetUsd: number | null;
  status: ShoppingStatus;
  transactionId: string | null;
  itemCount: number;
  checkedCount: number;
  total: number; // proyectado: sum(actual ?? estimated)
};

export type ProductOption = {
  id: string;
  name: string;
  unit: ProductUnit;
  lastUnitPriceUsd: number | null;
};

export type StoreOption = { id: string; name: string };
export type AccountOption = { id: string; name: string; currency: Currency };
export type CategoryOption = { id: string; name: string };
