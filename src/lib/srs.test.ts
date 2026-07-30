import { describe, expect, it } from "vitest";
import { DEFAULT_TARGETS, freshTuneFields, gradeTune, previewInterval } from "./srs";
import { addDays, todayStr } from "./dates";
import type { Tune } from "./types";

function makeTune(over: Partial<Tune> = {}): Tune {
  return {
    id: "t1",
    ...freshTuneFields({ title: "Test Reel", type: "Reel", tempo: 100 }),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe("gradeTune", () => {
  it("Good raises tempo by 2 and schedules ahead", () => {
    const t = makeTune({ tempo: 100 });
    const g = gradeTune(t, "good", DEFAULT_TARGETS);
    expect(g.tempo).toBe(102);
    expect(g.reps).toBe(1);
    expect(g.due).toBe(addDays(todayStr(), 1));
  });

  it("Again drops tempo by 8, resets reps, and is due today", () => {
    const t = makeTune({ tempo: 100, reps: 3, interval: 10 });
    const g = gradeTune(t, "again", DEFAULT_TARGETS);
    expect(g.tempo).toBe(92);
    expect(g.reps).toBe(0);
    expect(g.interval).toBe(0);
    expect(g.lapses).toBe(1);
    expect(g.due).toBe(todayStr());
  });

  it("never raises tempo above the per-type target", () => {
    const t = makeTune({ tempo: DEFAULT_TARGETS["Reel"] - 1 });
    const g = gradeTune(t, "easy", DEFAULT_TARGETS);
    expect(g.tempo).toBe(DEFAULT_TARGETS["Reel"]);
  });

  it("never drops tempo below the floor", () => {
    const t = makeTune({ tempo: 42 });
    const g = gradeTune(t, "again", DEFAULT_TARGETS);
    expect(g.tempo).toBe(40);
  });

  it("does not mutate the input tune", () => {
    const t = makeTune({ tempo: 100 });
    gradeTune(t, "good", DEFAULT_TARGETS);
    expect(t.tempo).toBe(100);
    expect(t.reps).toBe(0);
  });
});

describe("previewInterval", () => {
  it("labels the tempo delta and timing", () => {
    const t = makeTune({ tempo: 100 });
    expect(previewInterval(t, "good", DEFAULT_TARGETS)).toBe("1d +2");
    expect(previewInterval(t, "again", DEFAULT_TARGETS)).toBe("1d -8");
    expect(previewInterval(t, "hard", DEFAULT_TARGETS)).toBe("1d");
  });
});
