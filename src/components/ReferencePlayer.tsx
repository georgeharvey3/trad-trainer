import { useEffect, useMemo, useRef, useState } from "react";
import { loadYouTubeIframeApi, parseYouTube, type YTPlayer } from "../lib/youtube";

/** Playback speeds worth offering for learning by ear (YouTube only allows a
 *  discrete set; these are pitch-preserved in every modern browser). */
const SPEEDS = [0.5, 0.75, 1] as const;

interface Props {
  /** Raw YouTube URL stored on the tune. */
  url: string;
  /** Fired when the video begins playing, so the parent can stop the metronome. */
  onPlay: () => void;
}

/**
 * A tune's reference video with a speed control. The player loads when this
 * mounts; remount via `key` when the tune changes.
 */
export function ReferencePlayer({ url, onPlay }: Props) {
  const parsed = useMemo(() => parseYouTube(url), [url]);
  const [rate, setRate] = useState(1);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onPlayRef = useRef(onPlay);
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  useEffect(() => {
    if (!parsed || !hostRef.current) return;
    let cancelled = false;
    const mount = document.createElement("div"); // YT replaces this node with the iframe
    hostRef.current.appendChild(mount);
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        videoId: parsed.videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { start: parsed.start ?? 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) onPlayRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [parsed]);

  if (!parsed) return <div className="abc-status">That link isn’t a YouTube video.</div>;

  function setSpeed(r: number) {
    setRate(r);
    playerRef.current?.setPlaybackRate(r);
  }

  return (
    <div className="stack gap-sm">
      <div className="video">
        {rate !== 1 && <span className="rate-flag">{rate}×</span>}
        <div ref={hostRef} />
      </div>
      <div className="hrow gap-sm">
        <span className="eyebrow" style={{ width: 48 }}>
          Speed
        </span>
        <div className="seg grow" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button key={s} aria-pressed={s === rate} onClick={() => setSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
      <p className="small">Slowing down keeps the pitch. The metronome stops while the video plays.</p>
    </div>
  );
}
