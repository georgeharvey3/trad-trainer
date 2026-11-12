/**
 * ABC helpers: build a full ABC tune from a Library tune.
 * The Session gives only the body of the first setting, with `!` as the line
 * break. The app adds the header.
 */
import { DEFAULT_BEATS } from "./srs";
import type { LibraryTune } from "./types";

export type AbcSource = Pick<LibraryTune, "name" | "type" | "key"> & { abc: string };

// Meter of each tune type. A March can be 2/4 or 6/8 on The Session; the app
// takes 2/4. The legacy combined types stay as a fallback (see srs.ts).
const METERS: Record<string, [number, number]> = {
  Reel: [4, 4],
  Jig: [6, 8],
  "Slip Jig": [9, 8],
  Waltz: [3, 4],
  Hornpipe: [4, 4],
  Polka: [2, 4],
  Slide: [12, 8],
  Barndance: [4, 4],
  Strathspey: [4, 4],
  Mazurka: [3, 4],
  "Three-Two": [3, 2],
  March: [2, 4],
  "Jig/Slip Jig": [6, 8],
  "Hornpipe/Slow Reel/Polka": [4, 4],
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Length of one metronome beat as an ABC fraction: a 6/8 bar of 2 beats → `3/8`. */
function beatLength([num, den]: [number, number], beats: number): string {
  const d = den * beats;
  const g = gcd(num, d);
  return `${num / g}/${d / g}`;
}

/** ABC key field for a Session key: `Edorian` → `Edor`. */
function abcKey(key: string): string {
  const m = /^([A-G][b#]?)(.*)$/.exec(key.trim());
  return m ? m[1] + m[2].slice(0, 3) : key;
}

/**
 * The full ABC of a tune at `tempo`, in beats a minute. A beat is one pulse of
 * the metronome: `beats` to the bar, by default `DEFAULT_BEATS` of the type.
 */
export function tuneAbc(tune: AbcSource, tempo: number, beats = DEFAULT_BEATS[tune.type] ?? 4): string {
  const meter = METERS[tune.type] ?? METERS.Reel;
  return [
    "X:1",
    `T:${tune.name}`,
    `M:${meter[0]}/${meter[1]}`,
    "L:1/8",
    `Q:${beatLength(meter, beats)}=${Math.round(tempo)}`,
    `K:${abcKey(tune.key)}`,
    ...tune.abc.split("!"),
  ].join("\n");
}
