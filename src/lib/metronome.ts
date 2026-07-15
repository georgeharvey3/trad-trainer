/**
 * Web Audio metronome with a lookahead scheduler.
 * Ported from the prototype; wrapped as a class with a beat callback so React
 * can render the flashing beat dots. The first pulse of each bar is accented.
 */

type BeatCallback = (beatIdx: number, accent: boolean) => void;
type StateCallback = (running: boolean) => void;

export class Metronome {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bpm = 120;
  private beats = 4;
  private beatIdx = 0;
  private nextTime = 0;
  private wakeLock: WakeLockSentinel | null = null;

  running = false;
  onBeat: BeatCallback | null = null;
  onStateChange: StateCallback | null = null;

  constructor() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.running) this.requestWake();
    });
  }

  start(bpm: number, beats: number) {
    this.bpm = bpm;
    this.beats = beats;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    void this.ctx.resume();
    this.beatIdx = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    this.running = true;
    void this.requestWake();
    this.onStateChange?.(true);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    if (this.wakeLock) {
      void this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    this.onStateChange?.(false);
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  private schedule() {
    if (!this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const idx = this.beatIdx;
      const accent = idx === 0;
      this.click(this.nextTime, accent);
      const delay = Math.max(0, (this.nextTime - this.ctx.currentTime) * 1000);
      window.setTimeout(() => this.onBeat?.(idx, accent), delay);
      this.beatIdx = (this.beatIdx + 1) % this.beats;
      this.nextTime += 60 / this.bpm;
    }
  }

  private click(time: number, accent: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(accent ? 0.5 : 0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private async requestWake() {
    try {
      if ("wakeLock" in navigator) {
        this.wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* wake lock is best-effort */
    }
  }
}

/** Single shared metronome instance for the app. */
export const metronome = new Metronome();
