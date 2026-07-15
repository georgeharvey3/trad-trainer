/**
 * SRS core (SM-2 style) — pure functions, no I/O.
 * Ported verbatim in behaviour from the original prototype.
 */
import { addDays, todayStr } from "./dates";
import type { Grade, TargetMap, Tune, TuneType } from "./types";

// Ceiling the tempo ladder climbs toward (editable in Settings).
export const DEFAULT_TARGETS: TargetMap = {
  Reel: 220,
  "Jig/Slip Jig": 140,
  "Hornpipe/Slow Reel/Polka": 130,
  Waltz: 120,
};

// Prefill when adding a brand-new tune you're still learning.
export const LEARN_TEMPOS: TargetMap = {
  Reel: 100,
  "Jig/Slip Jig": 80,
  "Hornpipe/Slow Reel/Polka": 100,
  Waltz: 100,
};

export const DEFAULT_BEATS: Record<string, number> = {
  Reel: 4,
  "Jig/Slip Jig": 2,
  "Hornpipe/Slow Reel/Polka": 4,
  Waltz: 3,
};

// Tempo change applied alongside each SRS grade.
const TEMPO_DELTA: Record<Grade, number> = { again: -8, hard: 0, good: 2, easy: 4 };
const TEMPO_FLOOR = 40;

export type NewTuneInput = {
  title: string;
  type: TuneType;
  tempo: number;
  beats?: number;
};

/** Fresh SRS fields for a brand-new tune (id/persistence handled by the caller). */
export function freshTuneFields(input: NewTuneInput) {
  return {
    title: input.title,
    type: input.type,
    tempo: Math.round(input.tempo),
    beats: input.beats || DEFAULT_BEATS[input.type] || 4,
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: todayStr(),
    lastPracticed: null as string | null,
    recordingPath: null as string | null,
    recordingDurationMs: null as number | null,
  };
}

/** Returns a copy of the tune with schedule + tempo updated for the grade. */
export function gradeTune(tune: Tune, grade: Grade, targets: TargetMap): Tune {
  const t: Tune = { ...tune };
  const target = targets[t.type] || 200;
  const clampTempo = (v: number) => Math.min(target, Math.max(TEMPO_FLOOR, v));
  t.ease = t.ease || 2.5;

  if (grade === "again") {
    t.lapses = (t.lapses || 0) + 1;
    t.reps = 0;
    t.interval = 0;
    t.ease = Math.max(1.3, t.ease - 0.2);
  } else if (grade === "hard") {
    t.ease = Math.max(1.3, t.ease - 0.15);
    t.interval = t.interval < 1 ? 1 : t.interval * 1.2;
    t.reps = (t.reps || 0) + 1;
  } else if (grade === "good") {
    t.interval = t.interval < 1 ? 1 : t.interval < 3 ? 3 : t.interval * t.ease;
    t.reps = (t.reps || 0) + 1;
  } else if (grade === "easy") {
    t.ease = t.ease + 0.15;
    t.interval = t.interval < 1 ? 2 : t.interval * t.ease * 1.3;
    t.reps = (t.reps || 0) + 1;
  }
  t.interval = Math.min(365, t.interval);
  t.tempo = clampTempo(t.tempo + TEMPO_DELTA[grade]);
  t.due =
    grade === "again"
      ? todayStr()
      : addDays(todayStr(), Math.max(1, Math.round(t.interval)));
  t.lastPracticed = todayStr();
  return t;
}

/** Human label for what a grade would do to this tune's schedule + tempo. */
export function previewInterval(tune: Tune, grade: Grade, targets: TargetMap): string {
  const g = gradeTune(tune, grade, targets);
  const days = grade === "again" ? 0 : Math.max(1, Math.round(g.interval));
  const when =
    days === 0 ? "today" : days === 1 ? "1d" : days < 30 ? days + "d" : Math.round(days / 30) + "mo";
  const delta = g.tempo - tune.tempo;
  const dtxt = delta === 0 ? "" : (delta > 0 ? " +" : " ") + delta;
  return when + dtxt;
}
