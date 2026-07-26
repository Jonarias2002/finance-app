import { z } from 'zod';

export const PRODUCT_UNITS = ['unit', 'kg', 'g', 'liter', 'ml', 'pack'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/** Los mensajes son claves i18n de `products.errors`. */
export const productSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  unit: z.enum(PRODUCT_UNITS),
  defaultCategoryId: z.uuid().nullable(),
  isStaple: z.boolean(),
  typicalDays: z.number().int().positive().nullable(),
});

export const storeSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
});

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export type ProductRow = {
  id: string;
  name: string;
  unit: ProductUnit;
  defaultCategoryId: string | null;
  defaultCategoryName: string | null;
  isStaple: boolean;
  typicalDays: number | null;
};

export type StoreRow = { id: string; name: string };
export type CategoryOption = { id: string; name: string };
