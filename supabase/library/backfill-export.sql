-- Backfill step 1: export the Repertoire with candidate Library matches.
-- Run in the Supabase SQL editor after `top-100.sql`. It reads only.
--
-- Each `tunes` row gets the Library tune whose simplified name is the same
-- (lower case, no leading "the", letters and digits only), or nulls. Titles
-- often differ, so this is a draft for a person to check, not a rule.
-- Rows of the type "Hornpipe/Slow Reel/Polka" are flagged for a new type.
-- The SQL editor skips row-level security, so each row names its user.

with simple as (
  select
    t.id,
    t.user_id,
    t.title,
    t.type,
    regexp_replace(regexp_replace(lower(t.title), '^the\s+', ''), '[^a-z0-9]', '', 'g') as k
  from public.tunes t
),
lib as (
  select
    l.*,
    regexp_replace(regexp_replace(lower(l.name), '^the\s+', ''), '[^a-z0-9]', '', 'g') as k
  from public.library l
)
select
  s.user_id,
  s.title                                   as repertoire_title,
  s.type                                    as repertoire_type,
  l.session_id,
  l.name                                    as session_name,
  l.type                                    as session_type,
  case
    when l.id is null then 'no match'
    when l.type <> s.type then 'type differs'
    else ''
  end                                       as note,
  s.type = 'Hornpipe/Slow Reel/Polka'       as needs_new_type,
  s.id                                      as tune_id
from simple s
left join lib l on l.k = s.k
order by s.user_id, (l.id is null), s.title;
