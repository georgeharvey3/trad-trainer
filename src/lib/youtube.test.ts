import { describe, expect, it } from "vitest";
import { parseYouTube, isYouTubeUrl } from "./youtube";

describe("parseYouTube", () => {
  it("parses the standard watch URL", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
    });
  });

  it("parses the short youtu.be URL", () => {
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
  });

  it("parses shorts, embed and live paths", () => {
    for (const u of [
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      expect(parseYouTube(u)).toEqual({ videoId: "dQw4w9WgXcQ" });
    }
  });

  it("keeps a numeric start time", () => {
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ?t=90")).toEqual({
      videoId: "dQw4w9WgXcQ",
      start: 90,
    });
  });

  it("parses an h/m/s start time", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s")).toEqual({
      videoId: "dQw4w9WgXcQ",
      start: 90,
    });
  });

  it("accepts a URL without a scheme", () => {
    expect(parseYouTube("youtu.be/dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
  });

  it("accepts a bare 11-char video id", () => {
    expect(parseYouTube("dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
  });

  it("rejects non-YouTube and malformed input", () => {
    expect(parseYouTube("")).toBeNull();
    expect(parseYouTube("   ")).toBeNull();
    expect(parseYouTube("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTube("https://www.youtube.com/watch?v=tooshort")).toBeNull();
    expect(parseYouTube("just some text")).toBeNull();
  });

  it("isYouTubeUrl mirrors parse success", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});
