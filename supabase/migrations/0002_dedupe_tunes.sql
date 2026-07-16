-- Deduplicate any existing seed duplicates, then make duplicates impossible.
--
-- Background: a client-side race could seed the starter tune list twice,
-- producing two rows per (user_id, title, type). This migration removes the
-- extras and adds a unique index so the database rejects any future duplicate —
-- which also lets the app seed via an idempotent upsert (ON CONFLICT DO NOTHING).

-- 1. Remove duplicate rows, keeping one arbitrary row per group.
--    ctid is a guaranteed-unique physical row id, so this is robust even when
--    created_at is identical across a batch insert.
delete from public.tunes a
using public.tunes b
where a.user_id = b.user_id
  and a.title  = b.title
  and a.type   = b.type
  and a.ctid   > b.ctid;

-- 2. Prevent it from ever happening again.
create unique index if not exists tunes_user_title_type_key
  on public.tunes (user_id, title, type);
