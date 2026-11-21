/**
 * Bars of a rendered ABC tune, for looping chosen bars while a tune is learnt.
 *
 * abcjs keeps, on each rendered note and bar line, where it sits in the ABC
 * text (`startChar`, `endChar`). Walking the first voice gives each bar's span,
 * so a chosen run of bars can be cut out of the text and played on its own.
 * Pure: takes the shape of an abcjs tune object, not abcjs itself.
 */

export interface AbcElement {
  el_type: string;
  startChar: number;
  endChar: number;
  /** The drawn element; `elemset` holds its SVG nodes after rendering. */
  abselem?: { elemset?: Element[] };
}

export interface AbcLine {
  staff?: { voices?: AbcElement[][] }[];
}

export interface Bar {
  /** 1-based bar number, counted through the whole tune. */
  number: number;
  startChar: number;
  endChar: number;
  /** The notes of the bar, for highlighting. */
  notes: AbcElement[];
}

/** The bars of a tune, in order. A bar with no notes (a lone bar line) is left out. */
export function barsOf(lines: AbcLine[]): Bar[] {
  const bars: Bar[] = [];
  for (const line of lines) {
    const voice = line.staff?.[0]?.voices?.[0];
    if (!voice) continue;
    let current: Omit<Bar, "number"> | null = null;
    const close = () => {
      if (current && current.notes.length) bars.push({ number: bars.length + 1, ...current });
      current = null;
    };
    for (const el of voice) {
      if (el.el_type === "bar") {
        if (current) (current as Omit<Bar, "number">).endChar = el.endChar;
        close();
      } else if (el.el_type === "note") {
        if (!current) current = { startChar: el.startChar, endChar: el.endChar, notes: [] };
        current.notes.push(el);
        current.endChar = Math.max(current.endChar, el.endChar);
      }
    }
    // A line that ends without a bar line ends its bar too.
    close();
  }
  return bars;
}

/** The number of the bar that holds the character at `char`, or null. */
export function barAt(bars: Bar[], char: number): number | null {
  const bar = bars.find((b) => char >= b.startChar && char < b.endChar);
  return bar ? bar.number : null;
}

export interface BarRange {
  from: number;
  to: number;
}

/**
 * The loop after a tap on `bar`. With no loop, or a loop of several bars, the
 * tap starts a new one-bar loop. With a one-bar loop, the tap stretches it to
 * reach `bar`.
 */
export function tapBar(range: BarRange | null, bar: number): BarRange {
  if (!range || range.from !== range.to) return { from: bar, to: bar };
  return { from: Math.min(range.from, bar), to: Math.max(range.to, bar) };
}

/** Quick-pick ranges of `size` bars that cover a tune of `count` bars. */
export function chunks(count: number, size = 4): BarRange[] {
  const out: BarRange[] = [];
  for (let from = 1; from <= count; from += size) out.push({ from, to: Math.min(count, from + size - 1) });
  return out;
}

/** `learnt` with the bars of `range` added, sorted, without repeats. */
export function addLearnt(learnt: number[], range: BarRange): number[] {
  const set = new Set(learnt);
  for (let b = range.from; b <= range.to; b++) set.add(b);
  return [...set].sort((a, b) => a - b);
}

/** Label for a range: `Bar 5` or `Bars 4–6`. */
export function rangeLabel(r: BarRange): string {
  return r.from === r.to ? `Bar ${r.from}` : `Bars ${r.from}–${r.to}`;
}

/**
 * A tune of only the bars of `range`, to play in a loop: the header of
 * `fullAbc` (up to and with its `K:` line) and the text of those bars. Repeat
 * signs and endings become plain bar lines, so the loop plays each bar once.
 */
export function loopAbc(fullAbc: string, bars: Bar[], range: BarRange): string {
  const first = bars[range.from - 1];
  const last = bars[range.to - 1];
  if (!first || !last) return fullAbc;
  const lines = fullAbc.split("\n");
  const k = lines.findIndex((l) => l.startsWith("K:"));
  const header = lines.slice(0, k + 1).join("\n");
  const body = fullAbc
    .slice(first.startChar, last.endChar)
    .replace(/:*\|+:*|\[\||\|\]|::/g, "|")
    .replace(/\|\s*\[?[12](?![0-9/])/g, "|")
    .replace(/\[[12](?![0-9/])/g, "");
  const trimmed = body.trim();
  return `${header}\n${trimmed.endsWith("|") ? trimmed : `${trimmed}|`}`;
}
