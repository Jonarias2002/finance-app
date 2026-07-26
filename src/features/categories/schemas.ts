import { z } from 'zod';

export const CATEGORY_KINDS = ['income', 'expense'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Los mensajes son claves i18n de `categories.errors`. */
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'required').max(40, 'tooLong'),
  kind: z.enum(CATEGORY_KINDS),
});

export type ActionState =
  { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export type CategoryRow = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  isSystem: boolean;
};
