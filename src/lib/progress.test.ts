import { describe, expect, it } from "vitest";
import {
  biggestGains,
  dayCounts,
  heatmap,
  starterSet,
  streak,
  summarize,
  tempoSeries,
  typeBreakdown,
  weekStrip,
} from "./progress";
import { freshTuneFields } from "./srs";
import type { LibraryTune, Review, Tune } from "./types";

function review(tuneId: string, reviewedOn: string, tempoBefore: number, tempoAfter: number): Review {
  return { id: `${tuneId}-${reviewedOn}`, tuneId, grade: "good", tempoBefore, tempoAfter, reviewedOn, createdAt: reviewedOn };
}

function tune(id: string, tempo: number): Tune {
  return { id, ...freshTuneFields({ title: id, type: "Reel", tempo }), updatedAt: "" };
}

describe("streak", () => {
  const days = dayCounts([review("a", "2026-11-19", 100, 102), review("a", "2026-11-20", 102, 104), review("b", "2026-11-21", 90, 92)]);

  it("counts days in a row up to today", () => {
    expect(streak(days, "2026-11-21")).toBe(3);
  });

  it("stays alive on a day with no practice yet", () => {
    expect(streak(days, "2026-11-22")).toBe(3);
  });

  it("is broken by a missed day", () => {
    expect(streak(days, "2026-11-23")).toBe(0);
  });
});

describe("weekStrip", () => {
  it("runs Sunday to Saturday and marks today", () => {
    // 21 Nov 2026 is a Saturday.
    const week = weekStrip(dayCounts([review("a", "2026-11-18", 1, 1)]), "2026-11-21");
    expect(week.map((d) => d.label)).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    expect(week[0].date).toBe("2026-11-15");
    expect(week[3].played).toBe(true);
    expect(week[6].isToday).toBe(true);
  });
});

describe("heatmap", () => {
  it("gives weeks of 7 days ending in this week", () => {
    const cols = heatmap(dayCounts([review("a", "2026-11-21", 1, 1)]), 12, "2026-11-21");
    expect(cols).toHaveLength(12);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    expect(cols[11][6]).toMatchObject({ date: "2026-11-21", count: 1, level: 1, isToday: true });
  });
});

describe("tempoSeries", () => {
  it("starts at the first tempo then follows each review", () => {
    const rs = [review("a", "2026-11-01", 80, 82), review("b", "2026-11-01", 90, 92), review("a", "2026-11-05", 82, 86)];
    expect(tempoSeries(rs, "a").map((p) => p.tempo)).toEqual([80, 82, 86]);
  });
});

describe("biggestGains", () => {
  it("ranks tunes by tempo gained since their first review", () => {
    const rs = [review("a", "2026-11-01", 80, 82), review("b", "2026-11-01", 90, 92)];
    const gains = biggestGains(rs, [tune("a", 112), tune("b", 96), tune("c", 120)]);
    expect(gains.map((g) => [g.tune.id, g.gain])).toEqual([
      ["a", 32],
      ["b", 6],
    ]);
  });
});

describe("summarize", () => {
  it("adds up tempo changes and counts grades", () => {
    const s = summarize([
      { tuneId: "a", grade: "good", tempoBefore: 100, tempoAfter: 102, due: "" },
      { tuneId: "b", grade: "easy", tempoBefore: 104, tempoAfter: 108, due: "" },
      { tuneId: "c", grade: "again", tempoBefore: 88, tempoAfter: 80, due: "" },
    ]);
    expect(s.totalGain).toBe(-2);
    expect(s.best?.tuneId).toBe("b");
    expect(s.byGrade).toEqual({ again: 1, hard: 0, good: 1, easy: 1 });
  });
});

describe("typeBreakdown", () => {
  it("lists types by count with plurals", () => {
    const t = (type: string) => ({ type }) as Tune;
    expect(typeBreakdown([t("Reel"), t("Jig"), t("Reel"), t("Waltz"), t("Waltz"), t("Slip Jig")])).toBe(
      "2 reels · 2 waltzes · 1 jig · 1 slip jig",
    );
  });
});

describe("starterSet", () => {
  it("picks popular reels, jigs and a polka in D or G first", () => {
    const lib = (name: string, type: LibraryTune["type"], key: string, tunebooks: number): LibraryTune => ({
      id: name,
      sessionId: 0,
      name,
      type,
      key,
      tunebooks,
    });
    const set = starterSet([
      lib("r1", "Reel", "Edorian", 999),
      lib("r2", "Reel", "Dmajor", 500),
      lib("r3", "Reel", "Gmajor", 400),
      lib("j1", "Jig", "Gmajor", 300),
      lib("j2", "Jig", "Dmajor", 200),
      lib("p1", "Polka", "Amajor", 100),
    ]);
    expect(set.map((t) => t.id)).toEqual(["r2", "r3", "j1", "j2", "p1"]);
  });
});
