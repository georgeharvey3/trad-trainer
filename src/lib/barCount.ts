/**
 * The number of bars in each tune's score, as counted the last time its score
 * was drawn. Kept on the device so lists can show learning progress
 * (`3 of 16 bars`) without drawing every score.
 */
const KEY = "tradTrainer.barCounts.v1";

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function getBarCount(tuneId: string): number | null {
  return read()[tuneId] ?? null;
}

export function setBarCount(tuneId: string, count: number): void {
  try {
    const all = read();
    if (all[tuneId] === count) return;
    all[tuneId] = count;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage is a convenience only */
  }
}
