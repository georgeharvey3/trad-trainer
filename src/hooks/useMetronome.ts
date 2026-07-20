import { useEffect, useRef, useState } from "react";
import { metronome } from "../lib/metronome";

/**
 * Binds the shared metronome singleton to React. Returns the running state,
 * the currently-lit beat index, and start/stop controls.
 */
export function useMetronome() {
  const [running, setRunning] = useState(metronome.running);
  const [beat, setBeat] = useState<{ idx: number; accent: boolean } | null>(null);
  const beatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    metronome.onStateChange = (r) => {
      setRunning(r);
      if (!r) setBeat(null);
    };
    metronome.onBeat = (idx, accent) => {
      setBeat({ idx, accent });
      if (beatTimer.current) clearTimeout(beatTimer.current);
      beatTimer.current = setTimeout(() => setBeat(null), 90);
    };
    return () => {
      metronome.onStateChange = null;
      metronome.onBeat = null;
      if (beatTimer.current) clearTimeout(beatTimer.current);
      // Stop on unmount so leaving the practice view (e.g. switching tabs)
      // can't leave the metronome ticking with no visible way to stop it.
      metronome.stop();
    };
  }, []);

  return {
    running,
    beat,
    start: (bpm: number, beats: number) => metronome.start(bpm, beats),
    stop: () => metronome.stop(),
    setBpm: (bpm: number) => metronome.setBpm(bpm),
  };
}
