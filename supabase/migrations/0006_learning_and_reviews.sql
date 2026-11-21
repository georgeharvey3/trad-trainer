-- Learning stage and a log of reviews.
--
-- A tune is either being learnt or is in the rotation (the daily review). A
-- learning tune stays out of the practice queue. It keeps the bars of its
-- Library score that the user has marked as learnt; recording a full take moves
-- it into the rotation. Existing tunes are all in the rotation.
--
-- `reviews` keeps one row per grade, so the app can show a streak, a practice
-- calendar, tempo over time and the gain of each tune. Rows go with their tune.

alter table public.tunes
  add column if not exists stage text not null default 'rotation'
    check (stage in ('learning', 'rotation')),
  add column if not exists learnt_bars integer[] not null default '{}';

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  tune_id       uuid not null references public.tunes (id) on delete cascade,
  grade         text not null check (grade in ('again', 'hard', 'good', 'easy')),
  tempo_before  integer not null,
  tempo_after   integer not null,
  -- Local date of the review on the device that made it (`YYYY-MM-DD`).
  reviewed_on   date not null,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_user_day_idx on public.reviews (user_id, reviewed_on);
create index if not exists reviews_tune_idx on public.reviews (tune_id);

alter table public.reviews enable row level security;

create policy "reviews are self-readable"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "reviews are self-insertable"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- Delete is for "Undo" straight after a grade.
create policy "reviews are self-deletable"
  on public.reviews for delete
  using (auth.uid() = user_id);
