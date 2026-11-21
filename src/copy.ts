/**
 * Strings shared across screens. Screen-only copy sits in each screen, in
 * plain words (see design.md, CTA voice).
 */
import type { Grade } from "./lib/types";

export const copy = {
  app: {
    title: "Trad Trainer",
    loading: "Loading…",
    tabs: {
      today: "Today",
      tunes: "Tunes",
      you: "You",
    },
  },
  /**
   * The grades, each with a plain line so a grade means the same thing every
   * day. The line says how the tune felt, not what the schedule does with it.
   */
  grades: [
    { g: "again", label: "Again", line: "Fell apart. Back tomorrow, a bit slower." },
    { g: "hard", label: "Hard", line: "Got through, with slips." },
    { g: "good", label: "Good", line: "Solid. A touch faster next time." },
    { g: "easy", label: "Easy", line: "Could play it in my sleep." },
  ] as { g: Grade; label: string; line: string }[],
  gradeLabel: { again: "Again", hard: "Hard", good: "Good", easy: "Easy" } as Record<Grade, string>,
  abcPlayer: {
    play: "Play tune",
    stop: "Stop",
    loading: "Loading the sheet music…",
    loadFailed: "Couldn’t load the sheet music.",
    playFailed: "Couldn’t play the tune.",
    noAbc: "No sheet music for this tune.",
  },
};
