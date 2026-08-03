import { z } from 'zod';
import type { Currency } from '@/lib/format';

/** Tipos con categoría (ingreso/gasto). Las transferencias van aparte. */
export const TXN_TYPES = ['income', 'expense'] as const;
/** Tipos que ofrece el formulario, incluyendo transferencia. */
export const FORM_TYPES = ['income', 'expense', 'transfer'] as const;
export type TxnType = (typeof FORM_TYPES)[number];

export const CURRENCIES = ['USD', 'VES'] as const;

/** Los mensajes son claves i18n de `transactions.errors`. */
export const transactionSchema = z
  .object({
    type: z.enum(TXN_TYPES),
    accountId: z.uuid(),
    categoryId: z.uuid().nullable(),
    /** Tienda donde se hizo el gasto. Solo aplica a gastos (ver migración). */
    storeId: z.uuid().nullable(),
    amount: z.number().positive('amountRequired'),
    /** Moneda en la que se tecleó el monto; puede no ser la de la cuenta. */
    currency: z.enum(CURRENCIES),
    /**
     * Vacía solo en los movimientos de deuda: allí no se pide y la escribe el
     * servidor con la contraparte. El resto la exige (se comprueba en la acción,
     * que es donde ya se sabe si hay deuda).
     */
    description: z.string().trim().max(120, 'tooLong'),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  // El formulario ya oculta la tienda en los ingresos; esto cubre el envío
  // manipulado, que si no chocaría contra el check de la tabla.
  .transform((d) => (d.type === 'expense' ? d : { ...d, storeId: null }));

export const transferSchema = z
  .object({
    accountId: z.uuid(),
    transferAccountId: z.uuid(),
    amount: z.number().positive('amountRequired'),
    currency: z.enum(CURRENCIES),
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
  storeId: string | null;
  storeName: string | null;
  /** Deuda que pagó este movimiento, vía el abono enlazado. */
  debtId: string | null;
  /** Monto en la moneda de la cuenta: es lo que movió el saldo. */
  amount: number;
  currency: Currency;
  /** Lo que se tecleó, cuando se registró en otra moneda. Null = igual que la cuenta. */
  entryAmount: number | null;
  entryCurrency: Currency | null;
  amountUsd: number;
  exchangeRate: number;
  description: string;
  occurredAt: string;
};

/** Cómo afecta el movimiento a la deuda elegida. */
export const DEBT_MODES = ['partial', 'settle'] as const;
export type DebtMode = (typeof DEBT_MODES)[number];

/**
 * Lo que el formulario pregunta primero. No es una columna: `debtPayment` y
 * `debtCollection` son un gasto y un ingreso que además abonan una deuda. Existe
 * para no enseñar campos que no vienen a cuento — un pago de deuda no lleva
 * categoría, ni tienda, ni descripción a mano.
 */
export const MOVEMENT_KINDS = ['income', 'expense', 'debtPayment', 'debtCollection'] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const KIND_TYPE: Record<MovementKind, 'income' | 'expense'> = {
  income: 'income',
  expense: 'expense',
  debtPayment: 'expense',
  debtCollection: 'income',
};

export const KIND_DIRECTION: Record<MovementKind, DebtOption['direction'] | null> = {
  income: null,
  expense: null,
  debtPayment: 'i_owe',
  debtCollection: 'owed_to_me',
};

/**
 * Deuda abierta que un movimiento puede pagar. `direction` decide en qué tipo
 * aparece: lo que debo se paga con un gasto, lo que me deben entra como ingreso.
 */
export type DebtOption = {
  id: string;
  counterparty: string;
  direction: 'i_owe' | 'owed_to_me';
  currency: Currency;
  /** Lo que falta por pagar, en la moneda de la deuda. */
  remaining: number;
  /**
   * Las saldadas no se ofrecen, pero llegan igual: al editar el movimiento que
   * canceló una deuda, su deuda tiene que seguir estando en la lista.
   */
  isSettled: boolean;
};

export type AccountOption = { id: string; name: string; currency: Currency };
export type CategoryOption = { id: string; name: string; kind: 'income' | 'expense' };
export type StoreOption = { id: string; name: string };
/** Producto del catálogo, con su categoría por defecto, para autocompletar el gasto. */
export type ProductOption = { id: string; name: string; categoryId: string | null };
