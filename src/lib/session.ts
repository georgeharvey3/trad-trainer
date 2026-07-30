/**
 * Practice session / queue logic. The daily queue is per-device state
 * (which tunes have been served/done *today*); the durable schedule lives
 * on the server. These helpers are pure over (tunes, session, settings).
 */
import { todayStr } from "./dates";
import type { Session, Settings, Tune } from "./types";

const SESSION_KEY = "tradTrainer.session.v1";

export function freshSession(): Session {
  return { date: todayStr(), served: [], done: [], skipped: [], extra: 0 };
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

/** Tunes still waiting in today's queue: due, not yet graded, not skipped. */
export function dueTunes(tunes: Tune[], session: Session): Tune[] {
  const today = todayStr();
  const retired = new Set([...session.done, ...session.skipped]);
  return tunes.filter((t) => t.due <= today && !retired.has(t.id));
}

/**
 * Set a tune aside for today. It keeps its grade, schedule and tempo, stays out
 * of the done count, and releases the cap slot it took when it was served — a
 * skip should cost nothing but the tune's place in today's queue.
 */
export function skipTune(session: Session, id: string): Session {
  if (session.skipped.includes(id)) return session;
  return {
    ...session,
    served: session.served.filter((s) => s !== id),
    skipped: [...session.skipped, id],
  };
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
 * Due tunes we may still serve today, respecting the daily cap.
 * A tune already served but not yet graded stays eligible past the cap, so the
 * live tune can't vanish mid-practice when the cap runs out.
 */
export function eligibleTunes(tunes: Tune[], session: Session, settings: Settings): Tune[] {
  const served = new Set(session.served);
  const capLeft = sessionCap(session, settings) - served.size;
  return dueTunes(tunes, session).filter((t) => served.has(t.id) || capLeft > 0);
}

export function pickNext(
  tunes: Tune[],
  session: Session,
  settings: Settings,
  excludeId: string | null,
): Tune | null {
  const all = eligibleTunes(tunes, session, settings);
  const pool = all.filter((t) => t.id !== excludeId);
  if (pool.length === 0) return all.length ? all[0] : null;
  return pool[Math.floor(Math.random() * pool.length)];
}
