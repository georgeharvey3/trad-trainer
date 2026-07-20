-- Split the combined "Jig/Slip Jig" type into separate "Jig" (6/8, 2 pulses/bar)
-- and "Slip Jig" (9/8, 3 pulses/bar) types so slip jigs get their own metronome
-- accent pattern.
--
-- Step 1 renames every existing "Jig/Slip Jig" row to plain "Jig" (2 pulses).
-- Step 2 re-tags the tunes we can confidently identify as slip jigs to
-- "Slip Jig" with 3 pulses. Any slip jig not listed here stays a "Jig" and can
-- be re-tagged by hand in the edit screen.

-- 1. Everything currently combined becomes a plain jig.
update public.tunes
  set type = 'Jig', beats = 2
  where type = 'Jig/Slip Jig';

-- 2. Promote the known slip jigs (match by title, whatever their current type).
update public.tunes
  set type = 'Slip Jig', beats = 3
  where title in (
    'Jig of Slurs',
    'Rose in the Heather',
    'Foxhunters Slip Jig',
    'King Of The Pipers',
    'Hardiman The Fiddler',
    'Kiss For A Fig',
    'Fig for a Kiss',
    'The Butterfly'
  );
