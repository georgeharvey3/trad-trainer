/** Domain types shared across the app. Mirrors the Supabase schema. */

export const TUNE_TYPES = [
  "Reel",
  "Jig/Slip Jig",
  "Hornpipe/Slow Reel/Polka",
  "Waltz",
] as const;

export type TuneType = (typeof TUNE_TYPES)[number];

export type Grade = "again" | "hard" | "good" | "easy";

/**
 * A tune and its spaced-repetition state.
 * Dates are local `YYYY-MM-DD` strings (see lib/dates).
 */
export interface Tune {
  id: string;
  title: string;
  type: TuneType;
  tempo: number;
  beats: number;
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  lastPracticed: string | null;
  /** Storage path of the latest recording, or null if none. */
  recordingPath: string | null;
  recordingDurationMs: number | null;
  updatedAt: string;
}

export type TargetMap = Record<string, number>;

export interface Settings {
  dailyCap: number;
  targets: TargetMap;
}

/** Per-device, per-day practice queue state (not synced). */
export interface Session {
  date: string;
  served: string[];
  done: string[];
  extra: number;
}
