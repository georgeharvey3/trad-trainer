/**
 * Practice session / queue logic. The daily queue is per-device state
 * (which tunes have been served/done *today*); the durable schedule lives
 * on the server. These helpers are pure over (tunes, session, settings).
 */
import { todayStr } from "./dates";
import type { Session, Settings, Tune } from "./types";

const SESSION_KEY = "tradTrainer.session.v1";

export function freshSession(): Session {
  return { date: todayStr(), served: [], done: [], extra: 0 };
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s.date === todayStr()) return s;
    }
  } catch {
    /* ignore */
  }
  return freshSession();
}

export function saveSession(s: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function dueTunes(tunes: Tune[], session: Session): Tune[] {
  const today = todayStr();
  const done = new Set(session.done);
  return tunes.filter((t) => t.due <= today && !done.has(t.id));
}

export function sessionCap(session: Session, settings: Settings): number {
  return settings.dailyCap + (session.extra || 0);
}

/**
 * Due tunes we may still serve today, respecting the daily cap.
 * Tunes already served (e.g. graded Again) stay eligible past the cap.
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
