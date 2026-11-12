import { describe, expect, it } from "vitest";
import { buildLibrarySql } from "./library-sql";

describe("buildLibrarySql", () => {
  const sql = buildLibrarySql([
    { sessionId: 27, name: "Drowsy Maggie", type: "Reel", key: "Edorian", tunebooks: 8038 },
    { sessionId: 1, name: "Cooley's", type: "Reel", key: "Edorian", tunebooks: 6000 },
  ]);

  it("writes one upsert row per tune, keyed on session_id", () => {
    expect(sql).toContain("insert into public.library (session_id, name, type, key, tunebooks) values");
    expect(sql).toContain("(27, 'Drowsy Maggie', 'Reel', 'Edorian', 8038)");
    expect(sql).toContain("on conflict (session_id) do update");
  });

  it("refreshes tunebooks on a second run", () => {
    expect(sql).toContain("tunebooks = excluded.tunebooks");
  });

  it("escapes single quotes in names", () => {
    expect(sql).toContain("(1, 'Cooley''s', 'Reel', 'Edorian', 6000)");
  });
});
