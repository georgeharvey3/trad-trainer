import { describe, expect, it } from "vitest";
import { isDuplicate, isMissingSchema, MIGRATION_HINT, writeErrorText } from "./dbErrors";

describe("isMissingSchema", () => {
  it("spots a column the database doesn't have yet", () => {
    expect(isMissingSchema({ code: "PGRST204", message: "Could not find the 'stage' column of 'tunes' in the schema cache" })).toBe(true);
    expect(isMissingSchema({ code: "42703", message: 'column "learnt_bars" does not exist' })).toBe(true);
  });

  it("leaves other errors alone", () => {
    expect(isMissingSchema({ code: "23505", message: "duplicate key value" })).toBe(false);
    expect(isMissingSchema(null)).toBe(false);
  });
});

describe("writeErrorText", () => {
  it("points to the migration when the schema is old", () => {
    expect(writeErrorText({ code: "PGRST204", message: "x" }, "Couldn’t add the tune.")).toBe(MIGRATION_HINT);
  });

  it("keeps the database's own words otherwise", () => {
    expect(writeErrorText({ message: "network down" }, "Couldn’t add the tune.")).toBe("Couldn’t add the tune. (network down)");
    expect(writeErrorText(null, "Couldn’t add the tune.")).toBe("Couldn’t add the tune.");
  });
});

describe("isDuplicate", () => {
  it("spots a unique violation", () => {
    expect(isDuplicate({ code: "23505" })).toBe(true);
    expect(isDuplicate({ message: "nope" })).toBe(false);
  });
});
