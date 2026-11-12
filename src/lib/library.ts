/**
 * Library helpers: pure functions over Library tunes and Session data.
 * Also used by `scripts/ingest-library.ts`, so keep imports type-only.
 */
import type { LibraryTune, TuneType } from "./types";

const SESSION_TYPES: Record<string, TuneType> = {
  reel: "Reel",
  jig: "Jig",
  "slip jig": "Slip Jig",
  waltz: "Waltz",
  hornpipe: "Hornpipe",
  polka: "Polka",
  slide: "Slide",
  barndance: "Barndance",
  strathspey: "Strathspey",
  mazurka: "Mazurka",
  "three-two": "Three-Two",
  march: "March",
};

/** The app type for a Session type (`slip jig` → `Slip Jig`), or null. */
export function toTuneType(sessionType: string): TuneType | null {
  return SESSION_TYPES[sessionType.trim().toLowerCase()] ?? null;
}

export type LibrarySort = "popularity" | "title";

export interface LibraryQuery {
  search: string;
  sort: LibrarySort;
  reverse: boolean;
  /** Tune type to show, or "" for all. */
  type: string;
  /** Session key to show, or "" for all. */
  key: string;
}

/** The Library tunes that match the query, in the order the query asks for. */
export function libraryView(tunes: LibraryTune[], q: LibraryQuery): LibraryTune[] {
  const search = q.search.trim().toLowerCase();
  const list = tunes.filter(
    (t) =>
      (!search || t.name.toLowerCase().includes(search)) &&
      (!q.type || t.type === q.type) &&
      (!q.key || t.key === q.key),
  );
  list.sort((a, b) =>
    q.sort === "title" ? a.name.localeCompare(b.name) : b.tunebooks - a.tunebooks || a.name.localeCompare(b.name),
  );
  return q.reverse ? list.reverse() : list;
}

/** Display form of a Session key: `Gmajor` → `G major`, `F#minor` → `F# minor`. */
export function formatKey(key: string): string {
  const m = /^([A-G][b#]?)(.*)$/.exec(key.trim());
  if (!m || !m[2]) return key;
  return `${m[1]} ${m[2]}`;
}
