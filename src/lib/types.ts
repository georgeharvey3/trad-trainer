/** Domain types shared across the app. Mirrors the Supabase schema. */

/** The twelve tune types of The Session. A slow reel is a `Reel`. */
export const TUNE_TYPES = [
  "Reel",
  "Jig",
  "Slip Jig",
  "Waltz",
  "Hornpipe",
  "Polka",
  "Slide",
  "Barndance",
  "Strathspey",
  "Mazurka",
  "Three-Two",
  "March",
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
  /** Raw YouTube URL for a reference recording, or null. Parsed at render. */
  referenceUrl: string | null;
  /** The Library tune this tune was added from, or null. */
  libraryTuneId: string | null;
  updatedAt: string;
}

/** A tune of the Library: the shared list ingested from The Session. */
export interface LibraryTune {
  id: string;
  sessionId: number;
  name: string;
  type: TuneType;
  /** Key of the first setting, as The Session gives it (`Gmajor`). */
  key: string;
  /** Number of tunebooks that hold the tune. Gives the popularity rank. */
  tunebooks: number;
  /**
   * ABC body of the first setting, with `!` as the line break. Only a read
   * for one tune fills it: the list query leaves it out.
   */
  abc?: string;
}

export type TargetMap = Record<string, number>;

export interface Settings {
  dailyCap: number;
  targets: TargetMap;
}

/** Per-device, per-day practice queue state (not synced). */
export interface Session {
  date: string;
  /** Graded today. One cap slot each — nothing else spends the cap. */
  done: string[];
  /** Set aside for today: no grade, no schedule change, no cap slot used. */
  skipped: string[];
  extra: number;
}
