/**
 * Thin MediaRecorder wrapper. Records mic audio to a single Blob.
 * Kept UI-agnostic so a React hook can drive it.
 */

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

/** Pick the best container/codec the browser supports for our upload. */
export function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "audio/webm";
}

/** Whether this browser can record audio at all. */
export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export class TuneRecorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mimeType = "audio/webm";

  async start(): Promise<void> {
    if (!isRecordingSupported()) throw new Error("Recording is not supported in this browser.");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mimeType = pickMimeType();
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.startedAt = Date.now();
    this.rec.start();
  }

  /** Stop and resolve with the finished recording. */
  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      if (!this.rec) {
        reject(new Error("Not recording"));
        return;
      }
      const rec = this.rec;
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        this.cleanup();
        resolve({ blob, mimeType: this.mimeType, durationMs: Date.now() - this.startedAt });
      };
      rec.onerror = () => {
        this.cleanup();
        reject(new Error("Recording failed"));
      };
      rec.stop();
    });
  }

  /** Abort without producing a recording (e.g. user cancels). */
  cancel() {
    if (this.rec && this.rec.state !== "inactive") {
      this.rec.onstop = null;
      this.rec.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}
