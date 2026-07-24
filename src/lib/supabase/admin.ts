import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Admin client — uses the secret (service_role) key, which BYPASSES RLS.
 *
 * Only import this from Server Actions or Route Handlers running the admin
 * panel or the rate-sync cron. Never from a Client Component. The
 * `server-only` import above turns any client-side import into a build error.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
