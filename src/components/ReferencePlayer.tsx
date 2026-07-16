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
 * Collapsed-by-default reference video for the practice card.
 *
 * The player is created lazily the first time it's expanded, then kept mounted
 * (hidden when collapsed) so playback position and speed survive a collapse.
 * Remount via `key` when the tune changes to get a fresh video.
 */
export function ReferencePlayer({ url, onPlay }: Props) {
  const parsed = useMemo(() => parseYouTube(url), [url]);
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  // Keep the latest onPlay without re-running the player-creation effect.
  const onPlayRef = useRef(onPlay);
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  // Create the player the first time the panel is opened.
  useEffect(() => {
    if (!open || !parsed || playerRef.current || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    const mount = document.createElement("div"); // YT replaces this node with the iframe
    host.appendChild(mount);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        videoId: parsed.videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          start: parsed.start ?? 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => e.target.setPlaybackRate(rate),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) onPlayRef.current();
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // `rate` is intentionally omitted: it's only the initial value here, and
    // setSpeed drives the live player directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parsed]);

  // Tear the player down when the tune changes (component unmounts).
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  function setSpeed(r: number) {
    setRate(r);
    playerRef.current?.setPlaybackRate(r);
  }

  if (!parsed) return null;

  return (
    <div className="ref-block">
      {!open ? (
        <button className="ref-bar" onClick={() => setOpen(true)}>
          <span className="ref-thumb" aria-hidden="true">
            &#9654;
          </span>
          <span className="ref-bar-main">
            <span className="ref-bt">Reference recording</span>
            <span className="ref-bs">Tap to play along</span>
          </span>
          <span className="ref-chev">Show &#9656;</span>
        </button>
      ) : (
        <>
          <div className="ref-head">
            <span className="ref-label">Reference</span>
            <button className="ref-collapse" onClick={() => setOpen(false)}>
              Hide
            </button>
          </div>

          <div className="ref-video">
            <span className="ref-rate-flag">{rate}&times;</span>
            <div className="ref-video-host" ref={hostRef} />
          </div>

          <div className="ref-speed-row">
            <span className="ref-speed-label">Speed</span>
            <div className="ref-segmented" role="group" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={s === rate ? "active" : ""}
                  aria-pressed={s === rate}
                  onClick={() => setSpeed(s)}
                >
                  {s}&times;
                </button>
              ))}
            </div>
          </div>

          <div className="ref-hint">
            <b>Half-speed, same pitch.</b> The metronome stops while the video plays.
          </div>
        </>
      )}
    </div>
  );
}
