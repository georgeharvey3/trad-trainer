/** Local-time date helpers. All dates are `YYYY-MM-DD` strings in local time. */

function fmt(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function todayStr(): string {
  return fmt(new Date());
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  return fmt(new Date(y, m - 1, d + n));
}

export function daysUntil(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  const [ty, tm, td] = todayStr().split("-").map(Number);
  return Math.round(
    (new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) /
      86400000,
  );
}
