/**
 * Progress over time, worked out from the review log and today's results.
 * Pure functions; dates are local `YYYY-MM-DD` strings (see lib/dates).
 */
import { addDays, daysUntil, todayStr } from "./dates";
import type { Grade, LibraryTune, Review, SessionResult, Tune, TuneType } from "./types";

/** The days on which at least one tune was graded, with how many. */
export function dayCounts(reviews: Review[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of reviews) m.set(r.reviewedOn, (m.get(r.reviewedOn) ?? 0) + 1);
  return m;
}

/**
 * Days in a row with practice, up to today. A streak is still alive on a day
 * with no practice yet, so it counts back from yesterday then.
 */
export function streak(days: Map<string, number>, today = todayStr()): number {
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export interface WeekDay {
  date: string;
  label: string;
  played: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** This week, Sunday to Saturday, with the days that had practice. */
export function weekStrip(days: Map<string, number>, today = todayStr()): WeekDay[] {
  const start = addDays(today, -weekday(today));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, label: WEEKDAYS[i], played: days.has(date), isToday: date === today, isFuture: date > today };
  });
}

export interface HeatCell {
  date: string;
  count: number;
  /** 0 = none, 1–3 = more tunes. */
  level: 0 | 1 | 2 | 3;
  isToday: boolean;
  isFuture: boolean;
}

/** The last `weeks` weeks as columns of 7 days (Sunday first), oldest first. */
export function heatmap(days: Map<string, number>, weeks = 12, today = todayStr()): HeatCell[][] {
  const lastSunday = addDays(today, -weekday(today));
  const first = addDays(lastSunday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      const count = days.get(date) ?? 0;
      const level = (count === 0 ? 0 : count < 4 ? 1 : count < 8 ? 2 : 3) as HeatCell["level"];
      return { date, count, level, isToday: date === today, isFuture: date > today };
    }),
  );
}

export interface TempoPoint {
  date: string;
  tempo: number;
}

/** A tune's tempo over time: where it started, then after each review. */
export function tempoSeries(reviews: Review[], tuneId: string): TempoPoint[] {
  const mine = reviews.filter((r) => r.tuneId === tuneId);
  if (!mine.length) return [];
  return [
    { date: mine[0].reviewedOn, tempo: mine[0].tempoBefore },
    ...mine.map((r) => ({ date: r.reviewedOn, tempo: r.tempoAfter })),
  ];
}

export interface Gain {
  tune: Tune;
  from: number;
  to: number;
  gain: number;
}

/** Tunes ranked by tempo gained since their first logged review. */
export function biggestGains(reviews: Review[], tunes: Tune[], limit = 3): Gain[] {
  const first = new Map<string, number>();
  for (const r of reviews) if (!first.has(r.tuneId)) first.set(r.tuneId, r.tempoBefore);
  return tunes
    .filter((t) => first.has(t.id))
    .map((t) => ({ tune: t, from: first.get(t.id)!, to: t.tempo, gain: t.tempo - first.get(t.id)! }))
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, limit);
}

export interface SessionSummary {
  count: number;
  /** Sum of tempo changes, which can be negative. */
  totalGain: number;
  best: SessionResult | null;
  byGrade: Record<Grade, number>;
}

export function summarize(results: SessionResult[]): SessionSummary {
  const byGrade: Record<Grade, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  let totalGain = 0;
  let best: SessionResult | null = null;
  for (const r of results) {
    byGrade[r.grade]++;
    const gain = r.tempoAfter - r.tempoBefore;
    totalGain += gain;
    if (gain > 0 && (!best || gain > best.tempoAfter - best.tempoBefore)) best = r;
  }
  return { count: results.length, totalGain, best, byGrade };
}

const PLURALS: Partial<Record<TuneType, string>> = { Waltz: "waltzes", March: "marches" };

/** Plural, lower-case name of a tune type: `Slip Jig` → `slip jigs`. */
export function typePlural(type: string, n: number): string {
  const lower = type.toLowerCase();
  if (n === 1) return lower;
  return PLURALS[type as TuneType] ?? `${lower}s`;
}

/** `4 reels · 2 jigs · 1 hornpipe`, most common type first. */
export function typeBreakdown(tunes: Pick<Tune, "type">[]): string {
  const counts = new Map<string, number>();
  for (const t of tunes) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, n]) => `${n} ${typePlural(type, n)}`)
    .join(" · ");
}

/** When a tune is next due, in a few words: `today`, `tomorrow`, `Thu`, `in 9 days`. */
export function dueLabel(due: string): string {
  const d = daysUntil(due);
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 7) return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday(due)];
  return `in ${d} days`;
}

/**
 * `back in 6 days` or `back tomorrow`. A tune graded Again stays due today but
 * is retired from today's queue, so it is back tomorrow too.
 */
export function backIn(due: string): string {
  const d = daysUntil(due);
  if (d <= 1) return "back tomorrow";
  return `back in ${d} days`;
}

/**
 * Five tunes for a new player: the two most popular reels and jigs and the most
 * popular polka, keeping to D and G where the Library has them.
 */
export function starterSet(library: LibraryTune[]): LibraryTune[] {
  const easyKey = (k: string) => /^[DG](major|mixolydian)?$/i.test(k);
  const pick = (type: TuneType, n: number) => {
    const ofType = library.filter((t) => t.type === type).sort((a, b) => b.tunebooks - a.tunebooks);
    const easy = ofType.filter((t) => easyKey(t.key));
    return [...easy, ...ofType.filter((t) => !easyKey(t.key))].slice(0, n);
  };
  return [...pick("Reel", 2), ...pick("Jig", 2), ...pick("Polka", 1)];
}
