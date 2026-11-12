import { describe, expect, it } from "vitest";
import { tuneAbc, type AbcSource } from "./abc";

describe("tuneAbc", () => {
  it("adds the header to a reel and splits the body on !", () => {
    const abc = tuneAbc({ name: "Drowsy Maggie", type: "Reel", key: "Edorian", abc: "|:E2BE dEBE:|! d2fd c2ec|" }, 100);
    expect(abc).toBe(
      ["X:1", "T:Drowsy Maggie", "M:4/4", "L:1/8", "Q:1/4=100", "K:Edor", "|:E2BE dEBE:|", " d2fd c2ec|"].join("\n"),
    );
  });

  it("sets the meter, and the tempo on the beat of the metronome", () => {
    const header = (type: AbcSource["type"]) => tuneAbc({ name: "T", type, key: "Dmajor", abc: "" }, 90).split("\n");
    expect(header("Jig").slice(2, 5)).toEqual(["M:6/8", "L:1/8", "Q:3/8=90"]);
    expect(header("Slip Jig").slice(2, 5)).toEqual(["M:9/8", "L:1/8", "Q:3/8=90"]);
    expect(header("Polka").slice(2, 5)).toEqual(["M:2/4", "L:1/8", "Q:1/8=90"]);
    expect(header("Waltz").slice(2, 5)).toEqual(["M:3/4", "L:1/8", "Q:1/4=90"]);
    expect(header("Three-Two").slice(2, 5)).toEqual(["M:3/2", "L:1/8", "Q:1/2=90"]);
  });

  it("takes the beats of a Repertoire tune when they differ from its type", () => {
    const abc = tuneAbc({ name: "T", type: "Jig", key: "Dmajor", abc: "" }, 120, 6);
    expect(abc.split("\n")[4]).toBe("Q:1/8=120");
  });

  it("writes the Session key as an ABC key", () => {
    const key = (k: string) => tuneAbc({ name: "T", type: "Reel", key: k, abc: "" }, 90).split("\n")[5];
    expect(key("Gmajor")).toBe("K:Gmaj");
    expect(key("Amixolydian")).toBe("K:Amix");
    expect(key("F#minor")).toBe("K:F#min");
  });
});
