# Trad Trainer

A spaced-repetition practice app for traditional Irish tunes, with a type-aware
metronome and **per-tune audio recordings**. Tunes, progress, and recordings live
in the cloud and sync across your devices.

- **Frontend:** React + TypeScript + Vite, TanStack Query
- **Backend:** Supabase (Postgres + Auth + Storage), secured with row-level security

The original single-file prototype is archived in [`prototype/`](./prototype) for
reference.

## Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Create the database schema.** In the Supabase dashboard, open the SQL editor
   and run each file in [`supabase/migrations/`](./supabase/migrations) in order:
   - `0001_init.sql` — `profiles` and `tunes` tables, the private `recordings`
     storage bucket, and all row-level-security policies.
   - `0002_dedupe_tunes.sql` — removes any duplicate seed tunes and adds a unique
     index on `(user_id, title, type)` so duplicates can't recur.
   - `0005_library.sql` — the read-only `library` table and the
     `library_tune_id` link on `tunes`.
   - `0006_learning_and_reviews.sql` — the learning stage on `tunes`
     (`stage`, `learnt_bars`) and the `reviews` log behind the streak, the
     practice calendar and the tempo charts.

   Then run [`supabase/library/top-200.sql`](./supabase/library/top-200.sql) to
   fill the Library.

   > Using the Supabase CLI instead? `supabase db push` applies all migrations.

3. **Configure environment variables.** Copy the example and fill in your
   project's URL and anon key (Supabase dashboard → Project Settings → API):

   ```sh
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   Both values are safe to ship in the client; RLS is what protects the data. If
   they're missing, the app shows a setup screen instead of crashing.

4. **Run it**

   ```sh
   npm run dev        # http://localhost:5173
   ```

A new account starts with an empty Repertoire. Add tunes from the Library tab,
or add your own tunes in the Repertoire tab.

### Refresh the Library

The Library holds the top 200 tunes of [The Session](https://thesession.org).

1. Run `node scripts/ingest-library.ts`. The script writes
   `supabase/library/top-200.sql`. It does not write to the database.
2. Run `supabase/library/top-200.sql` in the Supabase SQL editor.

A second run does not make duplicates. It refreshes the popularity of each tune.

## Scripts

| Script              | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Vite dev server                           |
| `npm run build`     | Typecheck + production build to `dist/`   |
| `npm run preview`   | Serve the production build locally        |
| `npm run typecheck` | `tsc` with no emit                        |
| `npm run lint`      | ESLint                                    |
| `npm test`          | Vitest (SRS unit tests)                   |

## How it works

The app is built around a phone on a music stand: both hands are on the
instrument, so practice is big type and few taps. Three tabs: **Today**,
**Tunes** and **You**.

- **Today** — this week's practice days and streak, today's set (how many
  tunes, which types, the daily limit) and the tune you're learning. When the
  limit is reached it says how many tunes move to tomorrow and offers one bonus
  tune; when nothing is due it suggests learning time.
- **Practice (music-stand mode)** — full screen, screen kept awake. Each tune
  starts with a one-bar count-in, then shows a large tempo, a beat bar and ±2
  nudges. Notes, Video and Record open in sheets. Turn the phone sideways and
  the sheet music fills the screen. Grades stay hidden while you play: **Done**
  stops the click and asks how it went, with a plain line per grade:
  - **Again** — schedule reset, tempo −8 BPM
  - **Hard** — interval ×1.2, tempo held
  - **Good** — interval grows (1d → 3d → ×ease), tempo +2 BPM
  - **Easy** — interval grows faster, tempo +4 BPM

  Keys 1–4 grade; Space, Enter, PageDown and → (what page-turner pedals send)
  press Done. Between tunes a short recap shows the grade, the tempo change and
  when the tune is back, with **Undo**. The session ends with a summary. Every
  grade retires the tune from today's queue, Again included. **Skip** sets a tune
  aside with no grade and no cap slot used.

  The daily cap is spent by grading, not by being served, and only ever counts
  down. Tempo never goes past the per-type target. Grades persist to your
  account at once, and each one is logged in `reviews`.
- **Learning** — adding a Library tune asks whether you can already play it
  (it joins the rotation) or want to learn it (it goes on the learning shelf and
  stays out of the queue). Learning tools: tap a bar on the score and tap another
  to choose the bars to loop, slow them down, mark them learnt. Quick picks cover
  4-bar chunks. A full take moves the tune into the rotation, due tomorrow.
- **Tunes** — *Mine* lists learning tunes first, then the rotation with a small
  tempo line per tune; *Find* is the Library (the top 200 tunes of The Session)
  with type chips, a key filter, a starter set for new players, inline listening,
  and "Show 25 more". Each tune has its own page: tempo over time against the
  target, reviews and slip-ups, the take, the reference video and the sheet music.
- **You** — streak, a 12-week practice calendar, biggest tempo gains, then
  settings: daily limit, count-in, keep the screen on, target tempos, account,
  backup.
- **Recordings** — each tune holds one take, recorded with `MediaRecorder` into
  the private `recordings` bucket (`<user_id>/<tune_id>`) and played back through
  a short-lived signed URL. Recording stops the metronome.
- **Metronome** — Web Audio lookahead scheduler; the first pulse of each bar is
  accented. Pulses per bar come from the tune type (reel 4, jig 6/8 → 2,
  slip jig 9/8 → 3, waltz 3, hornpipe and polka 4).

## Installing it on a phone

The app ships a web app manifest (`public/manifest.webmanifest`, `display:
standalone`) plus the `apple-*` metas for older iOS, so adding it to a home
screen gives a full-screen app with no address bar or browser toolbar.

**On iPhone/iPad it must be added from Safari.** Chrome (and Firefox, and
Edge) on iOS can only create a bookmark shortcut that reopens *in that browser*,
chrome and all — that's an iOS restriction, not something the site can change.
Open the site in **Safari** → Share → **Add to Home Screen**.

On Android, Chrome's *Install app* / *Add to Home screen* does produce a
standalone window.

Two things to expect on iOS:

- A home-screen app has its own storage jar, separate from Safari's, so you sign
  in once more the first time you open it.
- There's no service worker, so the app still needs a connection — it talks to
  Supabase for every read and write anyway.

Icons live in [`public/`](./public) (`apple-touch-icon.png` is the one iOS uses;
`icon-192`/`icon-512`/`icon-maskable-512` and `icon.svg` cover everything else).

## Architecture

```
src/
├── lib/          srs, dates, session, types, library, metronome, recorder, supabase client
├── hooks/        TanStack Query hooks (tunes, settings, recordings) + metronome binding
├── auth/         AuthProvider + email/password sign-in
├── components/   Recorder, TuneEditor, AbcPlayer, AbcScore, ReferencePlayer, ui
├── practice/     Practice (music-stand mode)
└── pages/        Today, Tunes, TunePage, Learning, You
```

Data model (see the migration for full DDL + policies):

- **`profiles`** — one row per user; holds `settings` (daily cap, per-type target
  tempos) as JSON.
- **`tunes`** — SRS state per tune (tempo, ease, interval, due date, …), its
  stage (`learning` or `rotation`) and learnt bars, plus the storage path of its
  recording.
- **`reviews`** — one row per grade (grade, tempo before and after, local date).
- **`recordings` bucket** — private object storage, namespaced per user; every
  policy is gated on `auth.uid()`.

## Deploying

The frontend is a static build (`npm run build` → `dist/`). Host it anywhere
(Vercel, Netlify, Cloudflare Pages, S3). Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in the host's build environment. No separate backend to
run — Supabase is the backend.

For production auth, configure your site URL and email settings in the Supabase
dashboard (Authentication → URL Configuration / Email templates).
