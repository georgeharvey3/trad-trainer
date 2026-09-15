import { describe, expect, it } from "vitest";
import {
  capLeft,
  completeTune,
  dueTunes,
  eligibleTunes,
  freshSession,
  pickNext,
  practiceOrder,
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
    const session = skipTune(freshSession(), "a");

    expect(session.skipped).toEqual(["a"]);
    expect(session.done).toEqual([]);
    expect(dueTunes(tunes, session).map((t) => t.id)).toEqual(["b"]);
  });

  it("costs no cap slot", () => {
    const tunes = [makeTune("a"), makeTune("b"), makeTune("c")];
    const after = skipTune(skipTune(freshSession(), "a"), "b");
    // Cap of 2 is untouched by the two skips, so the third tune is still on.
    expect(capLeft(after, settings)).toBe(2);
    expect(eligibleTunes(tunes, after, settings).map((t) => t.id)).toEqual(["c"]);
  });

  it("is a no-op when the tune is already skipped", () => {
    const once = skipTune(freshSession(), "a");
    expect(skipTune(once, "a")).toBe(once);
  });

  it("never serves a skipped tune again today", () => {
    const tunes = [makeTune("a")];
    const session = skipTune(freshSession(), "a");
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
    const session = completeTune(freshSession(), "a");

    expect(session.done).toEqual(["a"]);
    expect(dueTunes(tunes, session).map((t) => t.id)).toEqual(["b"]);
    expect(pickNext(tunes, session, settings, null)?.id).toBe("b");
  });

  it("is a no-op when the tune is already done", () => {
    const once = completeTune(freshSession(), "a");
    expect(completeTune(once, "a")).toBe(once);
  });
});

describe("the daily cap", () => {
  it("is spent by grading a tune, not by being served one", () => {
    const tunes = [makeTune("a"), makeTune("b"), makeTune("c")];
    // Serving costs nothing: the session is untouched until a grade lands, so
    // opening a tune and walking away (app closed mid-practice) is free.
    expect(capLeft(freshSession(), settings)).toBe(2);

    const one = completeTune(freshSession(), "a");
    expect(capLeft(one, settings)).toBe(1);

    const two = completeTune(one, "b");
    expect(capLeft(two, settings)).toBe(0);
    expect(eligibleTunes(tunes, two, settings)).toEqual([]);
    expect(pickNext(tunes, two, settings, null)).toBeNull();
  });

  it("keeps the live tune on screen after the cap runs out", () => {
    const tunes = [makeTune("a"), makeTune("b"), makeTune("c")];
    // Cap spent on a and b while c is the tune in hand: c stays eligible, but
    // nothing new joins it.
    const spent = completeTune(completeTune(freshSession(), "a"), "b");
    expect(eligibleTunes(tunes, spent, settings, "c").map((t) => t.id)).toEqual(["c"]);
  });

  it("opens one more slot per `extra`", () => {
    const tunes = [makeTune("a"), makeTune("b"), makeTune("c")];
    const spent: Session = completeTune(completeTune(freshSession(), "a"), "b");
    expect(eligibleTunes(tunes, spent, settings)).toEqual([]);

    const oneMore = { ...spent, extra: 1 };
    expect(capLeft(oneMore, settings)).toBe(1);
    expect(eligibleTunes(tunes, oneMore, settings).map((t) => t.id)).toEqual(["c"]);
  });
});

describe("dueTunes", () => {
  it("only counts tunes due on or before today", () => {
    const tunes = [makeTune("a"), makeTune("b", { due: addDays(todayStr(), 3) })];
    expect(dueTunes(tunes, freshSession()).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("practiceOrder", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("puts the most overdue tunes first", () => {
    const tunes = [
      makeTune("today", { due: todayStr() }),
      makeTune("week", { due: addDays(todayStr(), -7) }),
      makeTune("yesterday", { due: addDays(todayStr(), -1) }),
    ];
    expect(practiceOrder(tunes).map((t) => t.id)).toEqual(["week", "yesterday", "today"]);
  });

  it("breaks ties the same way however the tunes arrive", () => {
    // Same due date for all, so every tune is tied on priority: the order must
    // come out identical whatever order the server hands them back in.
    const tunes = ids.map((id) => makeTune(id));
    const shuffled = [...tunes].reverse();
    expect(practiceOrder(shuffled).map((t) => t.id)).toEqual(practiceOrder(tunes).map((t) => t.id));
  });

  it("gives the same order every time within a day", () => {
    const tunes = ids.map((id) => makeTune(id));
    const first = practiceOrder(tunes, "2026-09-15").map((t) => t.id);
    // Re-opening the app is just another call with the same day seed.
    expect(practiceOrder(tunes, "2026-09-15").map((t) => t.id)).toEqual(first);
    expect(practiceOrder(tunes, "2026-09-15").map((t) => t.id)).toEqual(first);
  });

  it("reshuffles tied tunes on a different day", () => {
    const tunes = ids.map((id) => makeTune(id));
    const mon = practiceOrder(tunes, "2026-09-15").map((t) => t.id);
    const tue = practiceOrder(tunes, "2026-09-16").map((t) => t.id);
    expect(tue).not.toEqual(mon);
    expect([...tue].sort()).toEqual([...mon].sort());
  });

  it("leaves the caller's array alone", () => {
    const tunes = ids.map((id) => makeTune(id));
    practiceOrder(tunes);
    expect(tunes.map((t) => t.id)).toEqual(ids);
  });
});

describe("pickNext", () => {
  it("serves the top of the queue, not a random tune", () => {
    const tunes = [
      makeTune("today", { due: todayStr() }),
      makeTune("overdue", { due: addDays(todayStr(), -5) }),
    ];
    expect(pickNext(tunes, freshSession(), settings, null)?.id).toBe("overdue");
  });

  it("serves the same tune on every fresh start of the day", () => {
    const tunes = ["a", "b", "c", "d", "e"].map((id) => makeTune(id));
    // Closing and reopening the app starts from a fresh session again.
    const first = pickNext(tunes, freshSession(), settings, null)?.id;
    expect(pickNext(tunes, freshSession(), settings, null)?.id).toBe(first);
    expect(pickNext([...tunes].reverse(), freshSession(), settings, null)?.id).toBe(first);
  });

  it("works down the queue as tunes are graded", () => {
    const tunes = ["a", "b", "c"].map((id) => makeTune(id));
    const order = practiceOrder(tunes).map((t) => t.id);
    const first = pickNext(tunes, freshSession(), settings, null)!;
    expect(first.id).toBe(order[0]);

    const after = completeTune(freshSession(), first.id);
    expect(pickNext(tunes, after, settings, first.id)?.id).toBe(order[1]);
  });
});
