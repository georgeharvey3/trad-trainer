/**
 * Web Audio metronome with a lookahead scheduler.
 * Ported from the prototype; wrapped as a class with a beat callback so React
 * can render the flashing beat dots. The first pulse of each bar is accented.
 *
 * iOS can leave an AudioContext "suspended" or "interrupted" (screen lock, a
 * call, the mic recorder, another player taking the audio session). Its clock
 * then stops, so a scheduler driven only by it plays one beat and freezes. So:
 *  - the beat runs on the wall clock whenever the audio clock isn't moving,
 *    which keeps the screen counting even with no sound;
 *  - a stuck context is resumed, and replaced if it stays stuck;
 *  - every tap on the page nudges the context back to life.
 */

type BeatCallback = (beatIdx: number, accent: boolean) => void;
type StateCallback = (running: boolean) => void;

type Clock = "audio" | "wall";

/** How long the audio clock may stand still before we stop trusting it. */
const STALL_MS = 250;
/** How long to wait on a stuck context before throwing it away for a new one. */
const REPLACE_MS = 1500;

export class Metronome {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bpm = 120;
  private beats = 4;
  private beatIdx = 0;
  private nextTime = 0;
  private clock: Clock = "wall";
  private lastAudioTime = -1;
  private lastAudioMoved = 0;
  private stuckSince = 0;
  private wakeLock: WakeLockSentinel | null = null;

  running = false;
  onBeat: BeatCallback | null = null;
  onStateChange: StateCallback | null = null;

  constructor() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.running) {
        this.wake();
        void this.requestWake();
      }
    });
    // A tap is a user gesture, which is what iOS wants before it lets audio
    // start again.
    const unlock = () => this.wake();
    for (const ev of ["pointerdown", "touchend", "keydown"]) {
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    }
  }

  start(bpm: number, beats: number) {
    this.bpm = bpm;
    this.beats = beats;
    this.ensureContext();
    this.wake();
    this.beatIdx = 0;
    this.clock = this.audioLive() ? "audio" : "wall";
    this.lastAudioTime = -1;
    this.stuckSince = 0;
    this.nextTime = this.now() + 0.08;
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

  private ensureContext() {
    const state = this.ctx?.state as string | undefined;
    if (this.ctx && state !== "closed") return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctor ? new Ctor() : null;
    } catch {
      this.ctx = null;
    }
    this.lastAudioTime = -1;
  }

  /** Ask a paused context to carry on. Safe to call often. */
  private wake() {
    if (!this.ctx) return;
    if (this.ctx.state !== "running") void this.ctx.resume().catch(() => {});
  }

  /** Throw away a context that won't come back, and start a fresh one. */
  private replaceContext() {
    const old = this.ctx;
    this.ctx = null;
    void old?.close().catch(() => {});
    this.ensureContext();
    this.wake();
  }

  /** Is the audio clock running and actually moving forward? */
  private audioLive(): boolean {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return false;
    const wall = performance.now();
    if (ctx.currentTime !== this.lastAudioTime) {
      this.lastAudioTime = ctx.currentTime;
      this.lastAudioMoved = wall;
      return true;
    }
    return this.lastAudioMoved > 0 && wall - this.lastAudioMoved < STALL_MS;
  }

  private now(): number {
    return this.clock === "audio" && this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  private schedule() {
    const live = this.audioLive();
    const want: Clock = live ? "audio" : "wall";

    if (!live) {
      const wall = performance.now();
      if (!this.stuckSince) this.stuckSince = wall;
      this.wake();
      if (wall - this.stuckSince > REPLACE_MS) {
        this.stuckSince = wall;
        this.replaceContext();
      }
    } else {
      this.stuckSince = 0;
    }

    // Moving between clocks: carry the time to the next beat across so the
    // beat keeps its place.
    if (want !== this.clock) {
      const left = Math.max(0, this.nextTime - this.now());
      this.clock = want;
      this.nextTime = this.now() + Math.min(left, 60 / this.bpm);
    }

    const now = this.now();
    // Never play a burst of catch-up beats after a hiccup.
    if (this.nextTime < now - 0.1) this.nextTime = now + 0.05;

    while (this.nextTime < now + 0.12) {
      const idx = this.beatIdx;
      const accent = idx === 0;
      if (this.clock === "audio") this.click(this.nextTime, accent);
      const delay = Math.max(0, (this.nextTime - now) * 1000);
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
