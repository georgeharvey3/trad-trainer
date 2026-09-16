/**
 * Practice session / queue logic. The daily queue is per-device state
 * (which tunes have been done/skipped *today*); the durable schedule lives
 * on the server. These helpers are pure over (tunes, session, settings).
 */
import { todayStr } from "./dates";
import type { Session, Settings, Tune } from "./types";

const SESSION_KEY = "tradTrainer.session.v1";

export function freshSession(): Session {
  return { date: todayStr(), done: [], skipped: [], extra: 0 };
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Session>;
      // Spread over a fresh session so a session stored by an older build
      // (before `skipped`) still loads with every field present.
      if (s.date === todayStr()) return { ...freshSession(), ...s };
    }
  } catch {
    /* ignore */
  }
  return freshSession();
}

export function saveSession(s: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

/**
 * Stable 32-bit FNV-1a hash. Used to break ties in the practice order without
 * any randomness, so every device and every app launch agrees on the order.
 */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Today's practice order: highest priority first, where priority is how
 * overdue a tune is (earliest `due` first). Tunes on the same due date are
 * tied, and the tie is broken by a hash of the tune id seeded with the day —
 * fixed for the whole day, so reopening the app serves the same tunes in the
 * same order, but reshuffled tomorrow so no tune is stuck at the back.
 */
export function practiceOrder(tunes: Tune[], seed: string = todayStr()): Tune[] {
  return [...tunes].sort((a, b) => {
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    const ha = hash32(`${seed}:${a.id}`);
    const hb = hash32(`${seed}:${b.id}`);
    if (ha !== hb) return ha - hb;
    // Same hash (vanishingly rare): fall back to the id so the sort is total.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Tunes still waiting in today's queue: due, not yet graded, not skipped.
 * Returned in today's practice order (see `practiceOrder`).
 */
export function dueTunes(tunes: Tune[], session: Session): Tune[] {
  const today = todayStr();
  const retired = new Set([...session.done, ...session.skipped]);
  return practiceOrder(tunes.filter((t) => t.due <= today && !retired.has(t.id)));
}

/**
 * Set a tune aside for today. It keeps its grade, schedule and tempo, stays out
 * of the done count, and costs no cap slot — a skip should cost nothing but the
 * tune's place in today's queue.
 */
export function skipTune(session: Session, id: string): Session {
  if (session.skipped.includes(id)) return session;
  return { ...session, skipped: [...session.skipped, id] };
}

/** Retire a tune from today's queue after it has been graded. */
export function completeTune(session: Session, id: string): Session {
  if (session.done.includes(id)) return session;
  return { ...session, done: [...session.done, id] };
}

export function sessionCap(session: Session, settings: Settings): number {
  return settings.dailyCap + (session.extra || 0);
}

/**
 * How much of the *daily cap* is left today — the number shown as "cap left".
 * Only a graded tune spends a slot, so opening a tune and walking away costs
 * nothing: nothing is charged until you press a grade button, and that same
 * press is what counts the tune as done.
 *
 * Bonus slots from "Practice one more anyway" are deliberately not counted
 * here. `done` only ever grows, so once this reaches 0 it stays 0 for the rest
 * of the day: going past the cap is extra practice, not the cap being handed
 * back.
 */
export function capLeft(session: Session, settings: Settings): number {
  return Math.max(0, settings.dailyCap - session.done.length);
}

/**
 * Tunes we may still serve today: what's left of the daily cap plus any bonus
 * slots granted by "Practice one more anyway". This is the serving budget, not
 * the figure on screen — see `capLeft`.
 */
export function slotsLeft(session: Session, settings: Settings): number {
  return Math.max(0, sessionCap(session, settings) - session.done.length);
}

/**
 * Due tunes we may still serve today, respecting the daily cap.
 * `liveId` is the tune currently on screen (if any); it stays eligible even
 * when the cap has since run out, so the live tune can't vanish mid-practice.
 */
export function eligibleTunes(
  tunes: Tune[],
  session: Session,
  settings: Settings,
  liveId: string | null = null,
): Tune[] {
  const left = slotsLeft(session, settings);
  return dueTunes(tunes, session).filter((t) => t.id === liveId || left > 0);
}

/**
 * The next tune to serve: the top of today's queue. The queue is ordered, not
 * shuffled, so a session interrupted and resumed picks up where it left off.
 */
export function pickNext(
  tunes: Tune[],
  session: Session,
  settings: Settings,
  excludeId: string | null,
): Tune | null {
  const all = eligibleTunes(tunes, session, settings);
  const pool = all.filter((t) => t.id !== excludeId);
  if (pool.length === 0) return all.length ? all[0] : null;
  return pool[0];
}
