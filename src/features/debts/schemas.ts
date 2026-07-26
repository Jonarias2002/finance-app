import { z } from 'zod';
import type { Currency } from '@/lib/format';

export const DEBT_DIRECTIONS = ['i_owe', 'owed_to_me'] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const CURRENCIES = ['USD', 'VES'] as const;

/** Los mensajes son claves i18n de `debts.errors`. */
export const debtSchema = z.object({
  direction: z.enum(DEBT_DIRECTIONS),
  counterparty: z.string().trim().min(1, 'required').max(80, 'tooLong'),
  principal: z.number().positive('amountRequired'),
  currency: z.enum(CURRENCIES),
  description: z.string().trim().max(200, 'tooLong').nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export const paymentSchema = z.object({
  debtId: z.uuid(),
  amount: z.number().positive('amountRequired'),
  note: z.string().trim().max(200, 'tooLong').nullable(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export type PaymentRow = {
  id: string;
  amount: number;
  note: string | null;
  paidAt: string;
};

export type DebtRow = {
  id: string;
  direction: DebtDirection;
  counterparty: string;
  principal: number;
  currency: Currency;
  description: string | null;
  dueDate: string | null;
  isSettled: boolean;
  paid: number;
  remaining: number;
  payments: PaymentRow[];
};
