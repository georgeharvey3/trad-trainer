/**
 * ABC playback with abcjs: one shared synth for the app, so only one tune
 * plays at a time. Highlights each note of the rendered notation as it plays.
 */
import * as abcjs from "abcjs";

type Listener = () => void;

// Class on a note while it plays. Styled in index.css.
const NOTE_ON = "abc-note-on";

class AbcPlayback {
  private synth: abcjs.MidiBuffer | null = null;
  private timer: abcjs.TimingCallbacks | null = null;
  private litNotes: Element[] = [];
  // Bumped on each start and stop, so a start that is still loading the
  // sound font knows that it was cancelled.
  private generation = 0;
  private listeners = new Set<Listener>();

  /** The player that owns the current playback, or null when nothing plays. */
  owner: object | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Play a rendered tune. Call from a user gesture: it creates the audio context. */
  async start(visualObj: abcjs.TuneObject, owner: object): Promise<void> {
    this.stop();
    const generation = ++this.generation;
    this.setOwner(owner);
    const synth = new abcjs.synth.CreateSynth();
    try {
      // Some Session tunes carry chord symbols ("A"). Play only the melody.
      await synth.init({ visualObj, options: { chordsOff: true } });
      await synth.prime();
    } catch (err) {
      if (generation === this.generation) this.stop();
      throw err;
    }
    if (generation !== this.generation) return;
    this.synth = synth;
    this.timer = new abcjs.TimingCallbacks(visualObj, {
      eventCallback: (ev) => {
        this.unlight();
        if (!ev) {
          if (generation === this.generation) this.stop();
          return undefined;
        }
        for (const group of ev.elements ?? []) {
          for (const el of group) {
            el.classList.add(NOTE_ON);
            this.litNotes.push(el);
          }
        }
        return undefined;
      },
    });
    synth.start();
    this.timer.start();
  }

  /** True when `owner` started the current playback. */
  isOwner(owner: object): boolean {
    return this.owner === owner;
  }

  /** Stop playback only when `owner` started it. */
  stopIfOwner(owner: object) {
    if (this.owner === owner) this.stop();
  }

  stop() {
    this.generation++;
    this.synth?.stop();
    this.synth = null;
    this.timer?.stop();
    this.timer = null;
    this.unlight();
    this.setOwner(null);
  }

  private unlight() {
    for (const el of this.litNotes) el.classList.remove(NOTE_ON);
    this.litNotes = [];
  }

  private setOwner(owner: object | null) {
    if (this.owner === owner) return;
    this.owner = owner;
    for (const fn of this.listeners) fn();
  }
}

/** Single shared ABC playback for the app. */
export const abcPlayback = new AbcPlayback();
