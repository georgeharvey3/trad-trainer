import { describe, expect, it } from "vitest";
import { formatKey, libraryView, toTuneType } from "./library";
import type { LibraryTune } from "./types";

describe("toTuneType", () => {
  it("maps each Session type to its app type", () => {
    expect(toTuneType("reel")).toBe("Reel");
    expect(toTuneType("slip jig")).toBe("Slip Jig");
    expect(toTuneType("three-two")).toBe("Three-Two");
    expect(toTuneType("barndance")).toBe("Barndance");
  });

  it("returns null for a type the app does not know", () => {
    expect(toTuneType("schottische")).toBeNull();
  });
});

describe("formatKey", () => {
  it("splits the Session key into tonic and mode", () => {
    expect(formatKey("Gmajor")).toBe("G major");
    expect(formatKey("Edorian")).toBe("E dorian");
    expect(formatKey("Amixolydian")).toBe("A mixolydian");
  });

  it("keeps a flat or sharp on the tonic", () => {
    expect(formatKey("Bbmajor")).toBe("Bb major");
    expect(formatKey("F#minor")).toBe("F# minor");
  });
});

describe("libraryView", () => {
  const tune = (id: string, name: string, type: LibraryTune["type"], key: string, tunebooks: number): LibraryTune => ({
    id,
    sessionId: Number(id),
    name,
    type,
    key,
    tunebooks,
  });
  const lib = [
    tune("1", "The Kesh", "Jig", "Gmajor", 7804),
    tune("2", "Drowsy Maggie", "Reel", "Edorian", 8038),
    tune("3", "The Butterfly", "Slip Jig", "Eminor", 5000),
    tune("4", "Cooley's", "Reel", "Edorian", 6000),
  ];
  const base = { search: "", sort: "popularity", reverse: false, type: "", key: "" } as const;
  const names = (v: LibraryTune[]) => v.map((t) => t.name);

  it("sorts by popularity, most tunebooks first", () => {
    expect(names(libraryView(lib, base))).toEqual(["Drowsy Maggie", "The Kesh", "Cooley's", "The Butterfly"]);
  });

  it("sorts by title and reverses on request", () => {
    expect(names(libraryView(lib, { ...base, sort: "title" }))).toEqual([
      "Cooley's",
      "Drowsy Maggie",
      "The Butterfly",
      "The Kesh",
    ]);
    expect(names(libraryView(lib, { ...base, reverse: true }))).toEqual([
      "The Butterfly",
      "Cooley's",
      "The Kesh",
      "Drowsy Maggie",
    ]);
  });

  it("filters by name search, type and key", () => {
    expect(names(libraryView(lib, { ...base, search: " THE " }))).toEqual(["The Kesh", "The Butterfly"]);
    expect(names(libraryView(lib, { ...base, type: "Reel" }))).toEqual(["Drowsy Maggie", "Cooley's"]);
    expect(names(libraryView(lib, { ...base, key: "Eminor" }))).toEqual(["The Butterfly"]);
  });
});
