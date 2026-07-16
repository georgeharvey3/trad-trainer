/**
 * YouTube reference-video helpers.
 *
 * We store the raw URL the user pastes and parse it at render time — that keeps
 * the many URL shapes (watch, youtu.be, shorts, embed, with a `t=` start time)
 * out of the database and lets us re-parse if the rules ever change.
 */

export interface ParsedYouTube {
  videoId: string;
  /** Start offset in whole seconds, if the URL carried one (`t=` / `start=`). */
  start?: number;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Parse a pasted URL (or bare 11-char id) into a video id + start, or null. */
export function parseYouTube(input: string): ParsedYouTube | null {
  const raw = input.trim();
  if (!raw) return null;

  // A bare 11-char id (no host/path punctuation) — treat as the video id itself.
  // Checked before URL parsing, since `new URL("https://<id>")` would otherwise
  // succeed with the id as the hostname.
  if (!raw.includes("/") && !raw.includes(".") && ID_RE.test(raw)) {
    return { videoId: raw };
  }

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] || null;
  } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }

  if (!id || !ID_RE.test(id)) return null;

  const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return start != null ? { videoId: id, start } : { videoId: id };
}

/** True when the input looks like a usable YouTube link (for form validation). */
export function isYouTubeUrl(input: string): boolean {
  return parseYouTube(input) != null;
}

/** Accepts `90`, `90s`, `1m30s`, `1h2m3s`. Returns whole seconds or undefined. */
function parseStart(v: string | null): number | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  const m = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  return parseInt(m[1] ?? "0", 10) * 3600 + parseInt(m[2] ?? "0", 10) * 60 + parseInt(m[3] ?? "0", 10);
}

// ------------------------------------------------------------------
// IFrame Player API loader (loaded once, on demand).
// ------------------------------------------------------------------

export interface YTPlayer {
  setPlaybackRate(rate: number): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

export interface YTPlayerOptions {
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Resolve the global `YT` namespace, injecting the API script on first call. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    // The API fires a single global callback; chain any prior one just in case.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}
