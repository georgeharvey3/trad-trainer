import { DEFAULT_TARGETS } from "./srs";
import type { Settings, TargetMap } from "./types";

const LEGACY_HORNPIPE_POLKA = "Hornpipe/Slow Reel/Polka";

const DEFAULT_SETTINGS: Settings = { dailyCap: 10, targets: { ...DEFAULT_TARGETS } };

/**
 * Fill a stored profile's settings with defaults. The old combined
 * "Hornpipe/Slow Reel/Polka" target carries over to both Hornpipe and Polka,
 * unless the user has already set those.
 */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const stored: TargetMap = { ...(raw?.targets ?? {}) };
  const legacy = stored[LEGACY_HORNPIPE_POLKA];
  if (legacy !== undefined) {
    stored.Hornpipe ??= legacy;
    stored.Polka ??= legacy;
  }
  return {
    dailyCap: raw?.dailyCap ?? DEFAULT_SETTINGS.dailyCap,
    targets: { ...DEFAULT_TARGETS, ...stored },
  };
}
