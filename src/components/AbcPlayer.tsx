import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type * as abcjs from "abcjs";
import { useLibraryTune } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { LEARN_TEMPOS, targetTempo } from "../lib/srs";
import type { LibraryTune } from "../lib/types";
import { tuneAbc } from "../lib/abc";
import { abcPlayback } from "../lib/abcPlayback";
import { copy } from "../copy";
import { AbcScore } from "./AbcScore";
import { PlayIcon, StopIcon } from "./Icons";

interface Props {
  /** The Library tune to play. Its `abc` is read when the player mounts. */
  libraryTuneId: string;
  type: string;
  /** Metronome beats to the bar of the Repertoire tune. Without it, the beats of the type. */
  beats?: number;
  /** The tune's own tempo, offered as the first choice. Without it, a slow learning tempo. */
  tempo?: number;
  /** True while the recorder runs: playback is off then. */
  disabled?: boolean;
  /** Fired when playback starts, so the parent can stop the metronome. */
  onPlay?: () => void;
}

/** Sheet music of a Library tune, with playback that lights each note. */
export function AbcPlayer({ libraryTuneId, type, tempo, ...rest }: Props) {
  const tuneQ = useLibraryTune(libraryTuneId);
  const settingsQ = useSettings();

  if (tuneQ.isError) return <div className="abc-status">{copy.abcPlayer.loadFailed}</div>;
  const tune = tuneQ.data;
  const settings = settingsQ.data;
  if (!tune || !settings) return <div className="abc-status">{copy.abcPlayer.loading}</div>;
  if (!tune.abc) return <div className="abc-status">{copy.abcPlayer.noAbc}</div>;

  const target = targetTempo(settings.targets, type);
  const slow = tempo ?? LEARN_TEMPOS[type] ?? 80;
  const choices = [
    { label: tempo ? `Your tempo · ${slow}` : `Slow · ${slow}`, bpm: Math.min(slow, target) },
    { label: `Full speed · ${target}`, bpm: target },
  ];
  return <Player tune={tune} choices={choices} {...rest} />;
}

interface PlayerProps extends Omit<Props, "libraryTuneId" | "type" | "tempo"> {
  tune: LibraryTune;
  choices: { label: string; bpm: number }[];
}

function Player({ tune, choices, beats, disabled = false, onPlay }: PlayerProps) {
  const [choice, setChoice] = useState(0);
  const [error, setError] = useState(false);
  const visualRef = useRef<abcjs.TuneObject | null>(null);
  const [self] = useState(() => ({}));
  const bpm = choices[choice].bpm;

  const playing = useSyncExternalStore(
    (fn) => abcPlayback.subscribe(fn),
    () => abcPlayback.isOwner(self),
  );

  const abc = useMemo(() => tuneAbc({ ...tune, abc: tune.abc! }, bpm, beats), [tune, bpm, beats]);

  useEffect(() => {
    if (disabled) abcPlayback.stopIfOwner(self);
  }, [disabled, self]);
  useEffect(() => () => abcPlayback.stopIfOwner(self), [self]);

  function play(visual: abcjs.TuneObject) {
    setError(false);
    onPlay?.();
    abcPlayback.start(visual, self).catch(() => setError(true));
  }

  return (
    <div className="stack gap-sm">
      <AbcScore
        abc={abc}
        label={`Sheet music of ${tune.name}`}
        onRendered={(v) => {
          visualRef.current = v;
          // A new tempo draws a new tune object: play on from the start at that tempo.
          if (abcPlayback.isOwner(self)) play(v);
        }}
      />
      <div className="hrow gap-sm">
        <button
          className={`btn btn-sm ${playing ? "btn-primary" : "btn-secondary"}`}
          disabled={disabled}
          onClick={() => (playing ? abcPlayback.stop() : visualRef.current && play(visualRef.current))}
        >
          {playing ? <StopIcon size={14} /> : <PlayIcon size={14} />}
          {playing ? copy.abcPlayer.stop : copy.abcPlayer.play}
        </button>
        <div className="seg grow" role="group" aria-label="Playback tempo">
          {choices.map((c, i) => (
            <button key={c.label} aria-pressed={i === choice} onClick={() => setChoice(i)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="err" role="alert">
          {copy.abcPlayer.playFailed}
        </div>
      )}
    </div>
  );
}
