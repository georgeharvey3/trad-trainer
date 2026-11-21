import { describe, expect, it } from "vitest";
import { addLearnt, barAt, barsOf, chunks, loopAbc, rangeLabel, tapBar, type AbcElement } from "./bars";

const abc = "X:1\nT:Test\nM:4/4\nL:1/8\nK:D\n|:ABcd efga|bagf edcB:|\nd2 d2 e2 e2|f4 g4||";

/** Elements of `text` as abcjs would give them: notes and bar lines with char spans. */
function elements(text: string, offset: number): AbcElement[] {
  const out: AbcElement[] = [];
  const re = /(:*\|+:*)|([A-Ga-g][0-9]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({
      el_type: m[1] ? "bar" : "note",
      startChar: offset + m.index,
      endChar: offset + m.index + m[0].length,
    });
  }
  return out;
}

function linesOf(full: string) {
  const bodyStart = full.indexOf("\n", full.indexOf("K:")) + 1;
  const parts = full.slice(bodyStart).split("\n");
  let offset = bodyStart;
  return parts.map((p) => {
    const line = { staff: [{ voices: [elements(p, offset)] }] };
    offset += p.length + 1;
    return line;
  });
}

describe("barsOf", () => {
  it("numbers bars through the whole tune and skips empty ones", () => {
    const bars = barsOf(linesOf(abc));
    expect(bars.map((b) => b.number)).toEqual([1, 2, 3, 4]);
    expect(abc.slice(bars[0].startChar, bars[0].endChar)).toBe("ABcd efga|");
    expect(bars[2].notes).toHaveLength(4);
  });
});

describe("barAt", () => {
  it("finds the bar of a character", () => {
    const bars = barsOf(linesOf(abc));
    expect(barAt(bars, abc.indexOf("bagf"))).toBe(2);
    expect(barAt(bars, 0)).toBeNull();
  });
});

describe("tapBar", () => {
  it("starts a one-bar loop, stretches it, then starts again", () => {
    const one = tapBar(null, 5);
    expect(one).toEqual({ from: 5, to: 5 });
    const stretched = tapBar(one, 3);
    expect(stretched).toEqual({ from: 3, to: 5 });
    expect(tapBar(stretched, 8)).toEqual({ from: 8, to: 8 });
  });
});

describe("chunks", () => {
  it("covers the tune in 4-bar picks, the last one shorter", () => {
    expect(chunks(10)).toEqual([
      { from: 1, to: 4 },
      { from: 5, to: 8 },
      { from: 9, to: 10 },
    ]);
  });
});

describe("addLearnt", () => {
  it("adds a range without repeats", () => {
    expect(addLearnt([1, 2, 5], { from: 2, to: 4 })).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("rangeLabel", () => {
  it("names one bar or a run", () => {
    expect(rangeLabel({ from: 2, to: 2 })).toBe("Bar 2");
    expect(rangeLabel({ from: 4, to: 6 })).toBe("Bars 4–6");
  });
});

describe("loopAbc", () => {
  it("keeps the header and only the chosen bars, without repeat signs", () => {
    const bars = barsOf(linesOf(abc));
    const out = loopAbc(abc, bars, { from: 1, to: 2 });
    expect(out).toBe("X:1\nT:Test\nM:4/4\nL:1/8\nK:D\nABcd efga|bagf edcB|");
  });

  it("can cross a line", () => {
    const bars = barsOf(linesOf(abc));
    const out = loopAbc(abc, bars, { from: 2, to: 3 });
    expect(out.split("\n").slice(5).join("\n")).toBe("bagf edcB|\nd2 d2 e2 e2|");
  });
});
