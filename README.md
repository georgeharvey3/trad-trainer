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

The first time you sign up, the account is seeded with the 158 starter tunes.

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

- **Practice tab** — tap *Start practice* and a random due tune is served; the
  metronome auto-starts at that tune's current tempo. Grade it:
  - **Fail** — schedule reset, tempo −8 BPM
  - **Hard** — interval ×1.2, tempo held
  - **Good** — interval grows (1d → 3d → ×ease), tempo +2 BPM
  - **Easy** — interval grows faster, tempo +4 BPM

  The buttons show the label alone — the resulting interval and tempo change are
  the algorithm's business, not something to read mid-tune. Every grade retires
  the tune from today's queue, Fail included: it stays due (so it leads
  tomorrow's queue) but you don't play it twice in one sitting.
  **Skip** sets a tune aside instead — no grade, no schedule or tempo change, it
  doesn't count as done and doesn't use a daily-cap slot. Skipped tunes come back
  tomorrow.

  Tempo never exceeds the per-type target (Settings) and the −/+ buttons override
  it mid-practice. Grades and tempo changes persist to your account immediately.
- **Recordings** — each tune can hold one audio recording. Recording uses the
  browser's `MediaRecorder`; the clip uploads to the private `recordings` bucket
  (`<user_id>/<tune_id>`) and plays back via a short-lived signed URL. Recording
  is **mutually exclusive with the metronome** — starting one stops the other.
- **Daily cap** — at most N distinct tunes per day (default 10); the rest of the
  due queue carries over. "Practice one more anyway" extends today only. The daily
  queue is per-device; the durable schedule is synced.
- **Metronome** — Web Audio lookahead scheduler; the first pulse of each bar is
  accented. Pulses per bar come from the tune type (reel 4, jig 6/8 → 2,
  slip jig 9/8 → 3, waltz 3, polka 2) and are editable per tune.
- **Tunes tab** — search, add, edit, delete. A 🎤 marks tunes with a recording.

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
├── lib/          srs, dates, session, types, seed, metronome, recorder, supabase client
├── hooks/        TanStack Query hooks (tunes, settings, recordings) + metronome binding
├── auth/         AuthProvider + email/password sign-in
├── components/   Recorder, TuneModal
└── pages/        Practice, Tunes, Settings
```

Data model (see the migration for full DDL + policies):

- **`profiles`** — one row per user; holds `settings` (daily cap, per-type target
  tempos) as JSON.
- **`tunes`** — SRS state per tune (tempo, ease, interval, due date, …) plus the
  storage path of its recording.
- **`recordings` bucket** — private object storage, namespaced per user; every
  policy is gated on `auth.uid()`.

## Deploying

The frontend is a static build (`npm run build` → `dist/`). Host it anywhere
(Vercel, Netlify, Cloudflare Pages, S3). Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in the host's build environment. No separate backend to
run — Supabase is the backend.

For production auth, configure your site URL and email settings in the Supabase
dashboard (Authentication → URL Configuration / Email templates).
