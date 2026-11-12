/**
 * Ingest the top 200 tunes of The Session into a SQL file for the Library.
 *
 *   node scripts/ingest-library.ts
 *
 * Writes `supabase/library/top-200.sql`. It does not write to the database:
 * run the file in the Supabase SQL editor.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toTuneType } from "../src/lib/library.ts";
import { buildLibrarySql, type IngestTune } from "./library-sql.ts";

const BASE = "https://thesession.org";
const PAGES = [1, 2, 3, 4];
const PER_PAGE = 50;
/** Pause between requests to The Session, in milliseconds. */
const REQUEST_GAP_MS = 500;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "library", "top-200.sql");

interface PopularPage {
  tunes: { id: number; name: string; type: string; tunebooks: number }[];
}
interface TuneDetail {
  settings: { key: string }[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  await sleep(REQUEST_GAP_MS);
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function main() {
  const popular: PopularPage["tunes"] = [];
  for (const page of PAGES) {
    const data = await getJson<PopularPage>(`/tunes/popular?format=json&perpage=${PER_PAGE}&page=${page}`);
    popular.push(...data.tunes);
  }

  const tunes: IngestTune[] = [];
  for (const [i, t] of popular.entries()) {
    const type = toTuneType(t.type);
    if (!type) throw new Error(`Unknown Session type "${t.type}" for tune ${t.id} (${t.name})`);
    const detail = await getJson<TuneDetail>(`/tunes/${t.id}?format=json`);
    const key = detail.settings[0]?.key;
    if (!key) throw new Error(`Tune ${t.id} (${t.name}) has no settings`);
    tunes.push({ sessionId: t.id, name: t.name, type, key, tunebooks: t.tunebooks });
    console.log(`${i + 1}/${popular.length} ${t.name} (${type}, ${key})`);
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, buildLibrarySql(tunes));
  console.log(`Wrote ${tunes.length} tunes to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
