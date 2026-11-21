import { useEffect, useMemo, useRef, useState } from "react";
import { isRecordingSupported, TuneRecorder, type Recording } from "../lib/recorder";
import { useDeleteRecording, useRecordingUrl, useSaveRecording } from "../hooks/useRecording";
import type { Tune } from "../lib/types";
import { fmtDuration } from "../lib/format";
import { Sheet } from "./ui";
import { PauseIcon, PlayIcon, StopIcon } from "./Icons";

interface CommonProps {
  /** Why recording is off right now ("Stop the metronome first"), or null. */
  blockedReason?: string | null;
  /** Called when recording starts, so the parent can stop the metronome. */
  onRecordingStart?: () => void;
  /** Called when recording state changes, so the parent can lock other controls. */
  onRecordingChange?: (recording: boolean) => void;
}

/**
 * "saved": the tune exists; a take uploads straight away. `onSaved` runs after.
 * "draft": a new tune; the take is held and handed up, to upload once the tune is made.
 */
type Props =
  | ({ mode: "saved"; tune: Tune; onSaved?: (rec: Recording) => void; big?: boolean } & CommonProps)
  | ({ mode: "draft"; draft: Recording | null; onDraftChange: (rec: Recording | null) => void } & CommonProps);

function errorText(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (/denied|not allowed|permission/i.test(msg)) return "Microphone blocked. Allow it in your browser settings, then try again.";
  return msg || fallback;
}

export function Recorder(props: Props) {
  const { blockedReason = null, onRecordingStart, onRecordingChange } = props;
  const recorderRef = useRef<TuneRecorder>(new TuneRecorder());
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveRecording();
  const del = useDeleteRecording();

  const savedPath = props.mode === "saved" ? props.tune.recordingPath : null;
  const { data: savedUrl } = useRecordingUrl(savedPath);
  const draftRec = props.mode === "draft" ? props.draft : null;
  const draftUrl = useMemo(() => (draftRec ? URL.createObjectURL(draftRec.blob) : null), [draftRec]);
  useEffect(() => () => {
    if (draftUrl) URL.revokeObjectURL(draftUrl);
  }, [draftUrl]);

  useEffect(() => {
    const r = recorderRef.current;
    return () => r.cancel();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [recording]);

  const hasTake = props.mode === "saved" ? !!props.tune.recordingPath : !!props.draft;
  const playbackUrl = props.mode === "saved" ? savedUrl : draftUrl;
  const durationMs = props.mode === "saved" ? props.tune.recordingDurationMs : draftRec?.durationMs;

  function setLive(v: boolean) {
    setRecording(v);
    onRecordingChange?.(v);
  }

  async function start() {
    onRecordingStart?.();
    setError(null);
    try {
      await recorderRef.current.start();
      setStartedAt(Date.now());
      setNow(Date.now());
      setLive(true);
    } catch (err) {
      setError(errorText(err, "Couldn’t start recording."));
    }
  }

  async function stopAndSave() {
    try {
      const rec = await recorderRef.current.stop();
      setLive(false);
      if (props.mode === "draft") {
        props.onDraftChange(rec);
        return;
      }
      await save.mutateAsync({ tune: props.tune, recording: rec });
      props.onSaved?.(rec);
    } catch (err) {
      setLive(false);
      setError(errorText(err, "Couldn’t save your take. Try again."));
    }
  }

  function discard() {
    recorderRef.current.cancel();
    setLive(false);
  }

  async function remove() {
    setConfirmDelete(false);
    if (props.mode === "draft") {
      props.onDraftChange(null);
      return;
    }
    try {
      await del.mutateAsync(props.tune);
    } catch (err) {
      setError(errorText(err, "Couldn’t delete the take."));
    }
  }

  if (!isRecordingSupported()) {
    return (
      <div className="banner error" role="status">
        Recording doesn’t work in this browser.
      </div>
    );
  }

  const big = props.mode === "saved" && props.big;

  if (recording) {
    return (
      <div className="rec live" role="group" aria-label="Recording">
        <div className="hrow between">
          <span className="hrow gap-xs" style={{ fontWeight: 600, color: "var(--color-again)" }}>
            <span className="rec-dot" />
            Recording
          </span>
          <span className="rec-time" aria-live="off">
            {fmtDuration(now - startedAt)}
          </span>
        </div>
        <div className="hrow gap-sm">
          <button className="btn btn-primary grow" onClick={stopAndSave}>
            <StopIcon size={16} />
            Stop &amp; save
          </button>
          <button className="btn btn-secondary" onClick={discard}>
            Discard
          </button>
        </div>
      </div>
    );
  }

  if (save.isPending) {
    return (
      <div className="rec" role="status">
        <span className="hrow gap-sm small">
          <span className="spinner" />
          Saving your take…
        </span>
      </div>
    );
  }

  if (big) {
    return (
      <div className="stack gap-sm" style={{ alignItems: "center" }}>
        <button className="rec-big" aria-label="Start recording" disabled={!!blockedReason} onClick={start}>
          <span className="rec-dot" />
        </button>
        {error && (
          <div className="banner error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack gap-xs">
      {hasTake && playbackUrl ? (
        <TakePlayer url={playbackUrl} durationMs={durationMs ?? null} label={props.mode === "draft" ? "Take ready" : "Your take"} />
      ) : (
        <div className="rec" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <button
            className="icon-btn"
            aria-label="Start recording"
            style={{ borderColor: "var(--color-again-border)" }}
            disabled={!!blockedReason}
            onClick={start}
          >
            <span className="rec-dot" style={{ width: 14, height: 14 }} />
          </button>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Record a take</div>
            <div className="small">{blockedReason ?? (props.mode === "draft" ? "It’s saved with the tune." : "No take yet")}</div>
          </div>
        </div>
      )}
      {hasTake && (
        <div className="hrow gap-sm">
          <button className="btn btn-secondary btn-sm" disabled={!!blockedReason} onClick={start}>
            <span className="rec-dot" />
            Record again
          </button>
          <span className="grow" />
          <button className="btn btn-text btn-sm" style={{ color: "var(--color-again)" }} onClick={() => setConfirmDelete(true)}>
            {props.mode === "draft" ? "Discard take" : "Delete take"}
          </button>
        </div>
      )}
      {blockedReason && hasTake && <div className="small">{blockedReason}</div>}
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      {confirmDelete && (
        <Sheet label="Delete take" role="alertdialog" onClose={() => setConfirmDelete(false)}>
          <div className="h2">Delete this take?</div>
          <p className="lede mt-xs">It can’t be brought back.</p>
          <div className="stack gap-sm mt-lg">
            <button className="btn btn-secondary btn-block btn-lg" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            <button className="btn btn-danger-fill btn-block" onClick={remove}>
              Delete take
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** A take with our own play button and scrubber instead of the browser's audio bar. */
function TakePlayer({ url, durationMs, label }: { url: string; durationMs: number | null; label: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = (durationMs ?? 0) / 1000;

  return (
    <div className="rec">
      <div className="hrow between">
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="small num">{fmtDuration(durationMs)}</span>
      </div>
      <div className="hrow gap-sm">
        <button
          className="icon-btn solid"
          aria-label={playing ? "Pause take" : "Play take"}
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            if (a.paused) void a.play();
            else a.pause();
          }}
        >
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </button>
        <input
          className="scrub grow"
          type="range"
          min={0}
          max={Math.max(1, total)}
          step={0.1}
          value={pos}
          aria-label="Position in take"
          onChange={(e) => {
            const v = Number(e.target.value);
            setPos(v);
            if (audioRef.current) audioRef.current.currentTime = v;
          }}
        />
        <span className="small mono" style={{ width: 36, textAlign: "right" }}>
          {fmtDuration(pos * 1000)}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
      />
    </div>
  );
}
