import { z } from 'zod';

/** Límite de confianza del servidor (ADR 06). Los mensajes son claves i18n. */
export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export type AuthState =
  | {
      error?: string;
      fieldErrors?: { email?: string; password?: string };
    }
  | undefined;
