-- =============================================================================
-- profiles.theme — durable UI theme preference (per user, cross-device)
-- The cookie stays the SSR/no-flash cache; this column is the source of truth
-- synced into the cookie on login. Mirrors the existing `locale` column.
-- =============================================================================

alter table public.profiles
  add column if not exists theme text not null default 'system'
    check (theme in ('system', 'light', 'dark'));
