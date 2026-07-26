import { z } from 'zod';
import type { Currency } from '@/lib/format';

export const ACCOUNT_TYPES = ['cash', 'bank', 'digital'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CURRENCIES = ['USD', 'VES'] as const;

/** Límite de confianza del servidor. Los mensajes son claves i18n de `accounts.errors`. */
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  bankId: z.number().int().positive().nullable(),
});

export type AccountInput = z.infer<typeof accountSchema>;

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

/** Fila lista para la UI: cuenta + saldos derivados de la vista account_balances. */
export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  bankId: number | null;
  bankName: string | null;
  isArchived: boolean;
  total: number;
  reserved: number;
  available: number;
};

export type BankOption = { id: number; name: string };
