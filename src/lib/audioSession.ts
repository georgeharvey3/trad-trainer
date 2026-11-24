/**
 * iOS mutes Web Audio when the ringer/silent switch is on, because a web page
 * counts as "ambient" sound by default. Telling iOS we are a "playback" app
 * (like a music player) makes the metronome play through the silent switch.
 *
 * Safari 16.4+ has navigator.audioSession for this. Older iOS doesn't, so we
 * fall back to the old trick: a silent <audio> loop, which moves the page into
 * the playback category while it plays.
 */

type SessionType = "auto" | "playback" | "play-and-record" | "ambient" | "transient" | "transient-solo";

interface AudioSessionLike {
  type: SessionType;
}

function session(): AudioSessionLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { audioSession?: AudioSessionLike }).audioSession ?? null;
}

/** Set the session type. Returns false if this browser has no audioSession. */
export function setAudioSessionType(type: SessionType): boolean {
  const s = session();
  if (!s) return false;
  try {
    s.type = type;
  } catch {
    /* best-effort */
  }
  return true;
}

let silentEl: HTMLAudioElement | null = null;

/** A tiny silent WAV (8 kHz, mono, 8-bit, 0.1 s). */
function silentWavUrl(): string {
  const samples = 800;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => (bytes[o + i] = c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  str(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit silence is the midpoint
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "data:audio/wav;base64," + btoa(bin);
}

/**
 * Make audio play even with the silent switch on. Call from a user gesture
 * (e.g. pressing play) so the fallback <audio> is allowed to start.
 */
export function startPlaybackSession() {
  if (setAudioSessionType("playback")) return;
  if (typeof document === "undefined") return;
  try {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.src = silentWavUrl();
      silentEl.loop = true;
      silentEl.setAttribute("playsinline", "");
      silentEl.setAttribute("x-webkit-airplay", "deny");
    }
    void silentEl.play().catch(() => {});
  } catch {
    /* best-effort */
  }
}

/** Undo startPlaybackSession. */
export function endPlaybackSession() {
  setAudioSessionType("auto");
  silentEl?.pause();
}
