import { z } from 'zod';
import type { Currency } from '@/lib/format';

/** Los mensajes son claves i18n de `goals.errors`. */
export const goalSchema = z.object({
  name: z.string().trim().min(1, 'required').max(80, 'tooLong'),
  accountId: z.uuid(),
  targetAmount: z.number().positive('amountRequired'),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export const CONTRIBUTION_KINDS = ['add', 'withdraw'] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

export const contributionSchema = z.object({
  goalId: z.uuid(),
  kind: z.enum(CONTRIBUTION_KINDS),
  amount: z.number().positive('amountRequired'),
  note: z.string().trim().max(200, 'tooLong').nullable(),
  contributedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export type ContributionRow = {
  id: string;
  amount: number; // con signo: negativo = retiro
  note: string | null;
  contributedAt: string;
};

export type GoalRow = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  currency: Currency;
  targetAmount: number;
  targetDate: string | null;
  isAchieved: boolean;
  saved: number;
  remaining: number;
  contributions: ContributionRow[];
};
