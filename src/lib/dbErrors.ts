/**
 * Plain-words text for a failed database write. Supabase throws a plain
 * PostgrestError object (`{ message, code }`), not an Error.
 */
export function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "23505" || /duplicate key|unique constraint/i.test(e?.message ?? "");
}

/**
 * True when the database is older than the app: a column or table the app
 * writes is missing because a migration hasn't been run.
 */
export function isMissingSchema(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const msg = e?.message ?? "";
  return (
    e?.code === "PGRST204" ||
    e?.code === "PGRST205" ||
    e?.code === "42703" ||
    e?.code === "42P01" ||
    /could not find the .* column|column .* does not exist|could not find the table|relation .* does not exist/i.test(msg)
  );
}

export const MIGRATION_HINT =
  "Your database needs an update. Run supabase/migrations/0006_learning_and_reviews.sql in the Supabase SQL editor, then try again.";

/** What to tell the person when a write fails. */
export function writeErrorText(err: unknown, fallback: string): string {
  if (isMissingSchema(err)) return MIGRATION_HINT;
  const msg = (err as { message?: string } | null)?.message;
  return msg ? `${fallback} (${msg})` : fallback;
}
