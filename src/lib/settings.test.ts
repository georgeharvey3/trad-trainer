import { describe, expect, it } from "vitest";
import { normalizeSettings } from "./settings";

describe("normalizeSettings", () => {
  it("fills the defaults for an empty profile", () => {
    const s = normalizeSettings(null);
    expect(s.dailyCap).toBe(10);
    expect(s.targets.Reel).toBe(220);
    expect(s.targets.Polka).toBe(130);
    expect(s.targets.Mazurka).toBe(120);
  });

  it("gives the old combined target to both Hornpipe and Polka", () => {
    const s = normalizeSettings({ dailyCap: 5, targets: { "Hornpipe/Slow Reel/Polka": 150, Reel: 200 } });
    expect(s.targets.Hornpipe).toBe(150);
    expect(s.targets.Polka).toBe(150);
    expect(s.targets.Reel).toBe(200);
    expect(s.dailyCap).toBe(5);
  });

  it("keeps a Hornpipe or Polka target the user already set", () => {
    const s = normalizeSettings({ targets: { "Hornpipe/Slow Reel/Polka": 150, Polka: 160 } });
    expect(s.targets.Hornpipe).toBe(150);
    expect(s.targets.Polka).toBe(160);
  });
});
