import { createClient } from "@supabase/supabase-js";
import type { Tune, TuneType } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Whether the Supabase env vars are present. The UI shows a setup screen if not. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Fall back to harmless placeholders so the module can load and the app can
// render a setup screen instead of crashing with a blank page.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const RECORDINGS_BUCKET = "recordings";

/** Shape of a row in public.tunes (snake_case, as returned by PostgREST). */
export interface TuneRow {
  id: string;
  user_id: string;
  title: string;
  type: string;
  tempo: number;
  beats: number;
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  last_practiced: string | null;
  recording_path: string | null;
  recording_duration_ms: number | null;
  reference_url: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToTune(r: TuneRow): Tune {
  return {
    id: r.id,
    title: r.title,
    type: r.type as TuneType,
    tempo: r.tempo,
    beats: r.beats,
    ease: r.ease,
    interval: r.interval,
    reps: r.reps,
    lapses: r.lapses,
    due: r.due,
    lastPracticed: r.last_practiced,
    recordingPath: r.recording_path,
    recordingDurationMs: r.recording_duration_ms,
    referenceUrl: r.reference_url,
    updatedAt: r.updated_at,
  };
}

/** Columns we write back to the DB (excludes server-managed fields). */
export function tuneToRow(t: Partial<Tune>): Partial<TuneRow> {
  const r: Partial<TuneRow> = {};
  if (t.title !== undefined) r.title = t.title;
  if (t.type !== undefined) r.type = t.type;
  if (t.tempo !== undefined) r.tempo = t.tempo;
  if (t.beats !== undefined) r.beats = t.beats;
  if (t.ease !== undefined) r.ease = t.ease;
  if (t.interval !== undefined) r.interval = t.interval;
  if (t.reps !== undefined) r.reps = t.reps;
  if (t.lapses !== undefined) r.lapses = t.lapses;
  if (t.due !== undefined) r.due = t.due;
  if (t.lastPracticed !== undefined) r.last_practiced = t.lastPracticed;
  if (t.recordingPath !== undefined) r.recording_path = t.recordingPath;
  if (t.recordingDurationMs !== undefined) r.recording_duration_ms = t.recordingDurationMs;
  if (t.referenceUrl !== undefined) r.reference_url = t.referenceUrl;
  return r;
}
