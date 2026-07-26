import { z } from 'zod';
import type { Currency } from '@/lib/format';

/** Tipos con categoría (ingreso/gasto). Las transferencias van aparte. */
export const TXN_TYPES = ['income', 'expense'] as const;
/** Tipos que ofrece el formulario, incluyendo transferencia. */
export const FORM_TYPES = ['income', 'expense', 'transfer'] as const;
export type TxnType = (typeof FORM_TYPES)[number];

/** Los mensajes son claves i18n de `transactions.errors`. */
export const transactionSchema = z.object({
  type: z.enum(TXN_TYPES),
  accountId: z.uuid(),
  categoryId: z.uuid().nullable(),
  amount: z.number().positive('amountRequired'),
  description: z.string().trim().min(1, 'required').max(120, 'tooLong'),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const transferSchema = z
  .object({
    accountId: z.uuid(),
    transferAccountId: z.uuid(),
    amount: z.number().positive('amountRequired'),
    description: z.string().trim().min(1, 'required').max(120, 'tooLong'),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.accountId !== d.transferAccountId, {
    path: ['transferAccountId'],
    message: 'sameAccount',
  });

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

/** Fila lista para el libro contable. */
export type TxnRow = {
  id: string;
  type: TxnType;
  accountId: string;
  accountName: string;
  transferAccountId: string | null;
  transferAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  amount: number;
  currency: Currency;
  amountUsd: number;
  exchangeRate: number;
  description: string;
  occurredAt: string;
};

export type AccountOption = { id: string; name: string; currency: Currency };
export type CategoryOption = { id: string; name: string; kind: 'income' | 'expense' };
/** Producto del catálogo, con su categoría por defecto, para autocompletar el gasto. */
export type ProductOption = { id: string; name: string; categoryId: string | null };
