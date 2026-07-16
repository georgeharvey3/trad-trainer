-- Trad Trainer — add an optional YouTube reference video per tune.
-- Stores the raw pasted URL; the app parses out the video id (and any
-- start time) at render. Nullable, so existing tunes are unaffected.

alter table public.tunes
  add column if not exists reference_url text;
