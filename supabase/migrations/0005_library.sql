-- Library: the shared list of tunes ingested from The Session.
-- The Library is the same for every user. Signed-in users can read it; no
-- client can write to it. `scripts/ingest-library.ts` writes the rows as a SQL
-- file (`supabase/library/top-100.sql`) to run in the SQL editor.
--
-- A Repertoire tune (`tunes` row) copies its Library tune and keeps a link in
-- `library_tune_id`. See docs/adr/0001-repertoire-copies-library-tunes.md.

create table if not exists public.library (
  id          uuid primary key default gen_random_uuid(),
  session_id  integer not null unique,
  name        text not null,
  type        text not null check (type in (
                'Reel', 'Jig', 'Slip Jig', 'Waltz', 'Hornpipe', 'Polka', 'Slide',
                'Barndance', 'Strathspey', 'Mazurka', 'Three-Two', 'March'
              )),
  -- Key of the first setting, as The Session gives it (`Gmajor`).
  key         text not null,
  -- Number of tunebooks that hold the tune. Gives the popularity rank.
  tunebooks   integer not null default 0
);

alter table public.library enable row level security;

-- Read-only for signed-in users. With no insert/update/delete policy, RLS
-- rejects every client write.
create policy "library is readable by signed-in users"
  on public.library for select
  to authenticated
  using (true);

alter table public.tunes
  add column if not exists library_tune_id uuid references public.library (id) on delete set null;

-- One Repertoire tune per Library tune for each user.
create unique index if not exists tunes_user_library_key
  on public.tunes (user_id, library_tune_id)
  where library_tune_id is not null;

-- Split the combined "Hornpipe/Slow Reel/Polka" target in each profile into
-- "Hornpipe" and "Polka". A target the user already set stays.
update public.profiles
  set settings = jsonb_set(
    settings,
    '{targets}',
    jsonb_build_object(
      'Hornpipe', settings -> 'targets' -> 'Hornpipe/Slow Reel/Polka',
      'Polka', settings -> 'targets' -> 'Hornpipe/Slow Reel/Polka'
    ) || (settings -> 'targets')
  )
  where settings -> 'targets' ? 'Hornpipe/Slow Reel/Polka';
