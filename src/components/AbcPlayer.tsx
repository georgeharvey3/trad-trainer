import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as abcjs from "abcjs";
import { useLibraryTune } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { targetTempo } from "../lib/srs";
import type { LibraryTune } from "../lib/types";
import { tuneAbc } from "../lib/abc";
import { abcPlayback } from "../lib/abcPlayback";
import { copy } from "../copy";

// Wait this long after the last move of the tempo slider before the notation
// and the playback take the new tempo.
const TEMPO_SETTLE_MS = 300;

interface Props {
  /** The Library tune to play. Its `abc` is read when the player mounts. */
  libraryTuneId: string;
  /** Tune type whose target tempo is the start value of the tempo slider. */
  type: string;
  /** Metronome beats to the bar of the Repertoire tune. Without it, the beats of the type. */
  beats?: number;
  /** True while the recorder runs: playback is off then. */
  disabled?: boolean;
  /** Fired when playback starts, so the parent can stop the metronome. */
  onPlay?: () => void;
}

/** Notation of a Library tune, with playback that highlights each note. */
export function AbcPlayer({ libraryTuneId, type, ...rest }: Props) {
  const tuneQ = useLibraryTune(libraryTuneId);
  const settingsQ = useSettings();

  if (tuneQ.isError) return <div className="abc-status">{copy.abcPlayer.loadFailed}</div>;
  const tune = tuneQ.data;
  const settings = settingsQ.data;
  if (!tune || !settings) return <div className="abc-status">{copy.abcPlayer.loading}</div>;
  if (!tune.abc) return <div className="abc-status">{copy.abcPlayer.noAbc}</div>;

  return <Player tune={tune} initialTempo={targetTempo(settings.targets, type)} {...rest} />;
}

interface PlayerProps extends Omit<Props, "libraryTuneId" | "type"> {
  tune: LibraryTune;
  /** Start value of the tempo slider, in metronome beats a minute. */
  initialTempo: number;
}

function Player({ tune, initialTempo, beats, disabled = false, onPlay }: PlayerProps) {
  const [tempo, setTempo] = useState(initialTempo);
  const [settledTempo, setSettledTempo] = useState(initialTempo);
  const [error, setError] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<abcjs.TuneObject | null>(null);
  // Identity of this player for the shared playback.
  const [self] = useState(() => ({}));

  const playing = useSyncExternalStore(
    (fn) => abcPlayback.subscribe(fn),
    () => abcPlayback.isOwner(self),
  );

  useEffect(() => {
    const id = setTimeout(() => setSettledTempo(tempo), TEMPO_SETTLE_MS);
    return () => clearTimeout(id);
  }, [tempo]);

  const abc = useMemo(
    () => (tune.abc ? tuneAbc({ ...tune, abc: tune.abc }, settledTempo, beats) : null),
    [tune, settledTempo, beats],
  );

  useEffect(() => {
    if (!abc || !paperRef.current) return;
    const visual = abcjs.renderAbc(paperRef.current, abc, { responsive: "resize", add_classes: true })[0];
    visualRef.current = visual;
    // A new tempo gives a new tune object: play on from the start at that tempo.
    if (abcPlayback.isOwner(self)) abcPlayback.start(visual, self).catch(() => setError(true));
  }, [abc, self]);

  useEffect(() => {
    if (disabled) abcPlayback.stopIfOwner(self);
  }, [disabled, self]);

  useEffect(() => () => abcPlayback.stopIfOwner(self), [self]);

  function toggle() {
    if (playing) {
      abcPlayback.stop();
      return;
    }
    const visual = visualRef.current;
    if (!visual) return;
    setError(false);
    onPlay?.();
    abcPlayback.start(visual, self).catch(() => setError(true));
  }

  return (
    <div className="abc-player">
      <div className="abc-paper" ref={paperRef} />
      <div className="abc-controls">
        <button className="rec-btn" onClick={toggle} disabled={disabled}>
          {playing ? copy.abcPlayer.stop : copy.abcPlayer.play}
        </button>
        <label className="abc-tempo">
          <span>{copy.abcPlayer.tempo}</span>
          <input
            type="range"
            min={30}
            max={300}
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value, 10))}
          />
          <span className="abc-bpm">{copy.abcPlayer.bpm(tempo)}</span>
        </label>
      </div>
      {error && <div className="abc-status">{copy.abcPlayer.playFailed}</div>}
    </div>
  );
}
