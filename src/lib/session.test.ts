import { describe, expect, it } from "vitest";
import {
  completeTune,
  dueTunes,
  eligibleTunes,
  freshSession,
  pickNext,
  skipTune,
} from "./session";
import { freshTuneFields } from "./srs";
import { addDays, todayStr } from "./dates";
import type { Session, Settings, Tune } from "./types";

function makeTune(id: string, over: Partial<Tune> = {}): Tune {
  return {
    id,
    ...freshTuneFields({ title: id, type: "Reel", tempo: 100 }),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

const settings: Settings = { dailyCap: 2, targets: { Reel: 220 } };

describe("skipTune", () => {
  it("takes the tune out of today's queue without grading it", () => {
    const tunes = [makeTune("a"), makeTune("b")];
    const session = skipTune({ ...freshSession(), served: ["a"] }, "a");

    expect(session.skipped).toEqual(["a"]);
    expect(session.done).toEqual([]);
    expect(dueTunes(tunes, session).map((t) => t.id)).toEqual(["b"]);
  });

  it("releases the cap slot the skipped tune was holding", () => {
    const tunes = [makeTune("a"), makeTune("b"), makeTune("c")];
    const served: Session = { ...freshSession(), served: ["a", "b"] };
    // Cap of 2 is spent, so nothing new is eligible...
    expect(eligibleTunes(tunes, served, settings).map((t) => t.id)).toEqual(["a", "b"]);
    // ...until one of the two is skipped, which hands its slot back.
    const after = skipTune(served, "a");
    expect(eligibleTunes(tunes, after, settings).map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("is a no-op when the tune is already skipped", () => {
    const once = skipTune(freshSession(), "a");
    expect(skipTune(once, "a")).toBe(once);
  });

  it("never serves a skipped tune again today", () => {
    const tunes = [makeTune("a")];
    const session = skipTune({ ...freshSession(), served: ["a"] }, "a");
    expect(pickNext(tunes, session, settings, null)).toBeNull();
  });

  it("leaves the tune due again tomorrow", () => {
    // Today's skip lives only in the per-day session, so a fresh session (the
    // one tomorrow starts with) still has the tune due.
    const tunes = [makeTune("a")];
    expect(dueTunes(tunes, freshSession()).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("completeTune", () => {
  it("retires a graded tune from today's queue and counts it as done", () => {
    // Again leaves the tune due today; the session is what stops it repeating.
    const tunes = [makeTune("a", { due: todayStr() }), makeTune("b")];
    const session = completeTune({ ...freshSession(), served: ["a"] }, "a");

    expect(session.done).toEqual(["a"]);
    expect(dueTunes(tunes, session).map((t) => t.id)).toEqual(["b"]);
    expect(pickNext(tunes, session, settings, null)?.id).toBe("b");
  });

  it("is a no-op when the tune is already done", () => {
    const once = completeTune(freshSession(), "a");
    expect(completeTune(once, "a")).toBe(once);
  });
});

describe("dueTunes", () => {
  it("only counts tunes due on or before today", () => {
    const tunes = [makeTune("a"), makeTune("b", { due: addDays(todayStr(), 3) })];
    expect(dueTunes(tunes, freshSession()).map((t) => t.id)).toEqual(["a"]);
  });
});
