-- Trad Trainer — initial schema
-- Run in the Supabase SQL editor, or via the Supabase CLI (`supabase db push`).
--
-- Tables: profiles (per-user settings), tunes (SRS state).
-- Recordings are stored as objects in the private `recordings` storage bucket,
-- with the object path recorded on the owning tune row.
-- All access is gated by row-level security keyed on auth.uid().

-- ------------------------------------------------------------------
-- Helper: keep updated_at fresh on write.
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are self-insertable"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- tunes
-- ------------------------------------------------------------------
create table if not exists public.tunes (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  title                  text not null,
  type                   text not null,
  tempo                  integer not null,
  beats                  integer not null default 4,
  ease                   real not null default 2.5,
  interval               real not null default 0,
  reps                   integer not null default 0,
  lapses                 integer not null default 0,
  due                    date not null default (now() at time zone 'utc')::date,
  last_practiced         date,
  recording_path         text,
  recording_duration_ms  integer,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists tunes_user_id_idx on public.tunes (user_id);
create index if not exists tunes_user_due_idx on public.tunes (user_id, due);

alter table public.tunes enable row level security;

create policy "tunes are self-readable"
  on public.tunes for select
  using (auth.uid() = user_id);

create policy "tunes are self-insertable"
  on public.tunes for insert
  with check (auth.uid() = user_id);

create policy "tunes are self-updatable"
  on public.tunes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tunes are self-deletable"
  on public.tunes for delete
  using (auth.uid() = user_id);

create trigger tunes_updated_at
  before update on public.tunes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- storage: private `recordings` bucket, objects namespaced by user id
-- Path convention: `<user_id>/<tune_id>.webm`
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "recordings are self-readable"
  on storage.objects for select
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings are self-insertable"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings are self-updatable"
  on storage.objects for update
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings are self-deletable"
  on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
