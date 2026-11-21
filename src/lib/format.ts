/** `m:ss` for a duration in milliseconds. */
export function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return "0:00";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
