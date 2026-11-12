import { describe, expect, it } from "vitest";
import { buildLibrarySql } from "./library-sql";

describe("buildLibrarySql", () => {
  const sql = buildLibrarySql([
    { sessionId: 27, name: "Drowsy Maggie", type: "Reel", key: "Edorian", tunebooks: 8038, abc: "|:E2BE dEBE|" },
    { sessionId: 1, name: "Cooley's", type: "Reel", key: "Edorian", tunebooks: 6000, abc: "D'E|F2\r\nGA|" },
  ]);

  it("writes one upsert row per tune, keyed on session_id", () => {
    expect(sql).toContain("insert into public.library (session_id, name, type, key, tunebooks, abc) values");
    expect(sql).toContain("(27, 'Drowsy Maggie', 'Reel', 'Edorian', 8038, '|:E2BE dEBE|')");
    expect(sql).toContain("on conflict (session_id) do update");
  });

  it("refreshes tunebooks on a second run", () => {
    expect(sql).toContain("tunebooks = excluded.tunebooks");
  });

  it("escapes single quotes in names and ABC, and keeps ABC line breaks", () => {
    expect(sql).toContain("(1, 'Cooley''s', 'Reel', 'Edorian', 6000, 'D''E|F2\r\nGA|')");
  });
});
