import { useEffect, useMemo, useRef, useState } from "react";
import { isRecordingSupported, TuneRecorder, type Recording } from "../lib/recorder";
import { useDeleteRecording, useRecordingUrl, useSaveRecording } from "../hooks/useRecording";
import type { Tune } from "../lib/types";

interface CommonProps {
  /** True while the metronome is running — recording is disabled then. */
  metronomeRunning: boolean;
  /** Called when recording starts, so the parent can stop the metronome. */
  onRecordingStart: () => void;
  /** Called when recording state changes, so the parent can gate the metronome. */
  onRecordingChange: (recording: boolean) => void;
}

/**
 * "saved" — the tune already exists; record/delete persist straight to storage.
 * "draft" — used while adding a new tune: the capture is held locally and reported
 * up via `onDraftChange`, so the parent can upload it once the tune is created.
 */
type Props =
  | ({ mode: "saved"; tune: Tune } & CommonProps)
  | ({ mode: "draft"; draft: Recording | null; onDraftChange: (rec: Recording | null) => void } & CommonProps);

function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Recorder(props: Props) {
  const { metronomeRunning, onRecordingStart, onRecordingChange } = props;
  const recorderRef = useRef<TuneRecorder>(new TuneRecorder());
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string>("");
  const save = useSaveRecording();
  const del = useDeleteRecording();

  const savedPath = props.mode === "saved" ? props.tune.recordingPath : null;
  const { data: savedUrl } = useRecordingUrl(savedPath);

  // Draft playback plays the in-memory blob via a temporary object URL.
  const draftRec = props.mode === "draft" ? props.draft : null;
  const draftUrl = useMemo(
    () => (draftRec ? URL.createObjectURL(draftRec.blob) : null),
    [draftRec],
  );
  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  const supported = isRecordingSupported();
  const hasRecording = props.mode === "saved" ? !!props.tune.recordingPath : !!props.draft;
  const playbackUrl = props.mode === "saved" ? savedUrl : draftUrl;
  const durationMs = props.mode === "saved" ? props.tune.recordingDurationMs : draftRec?.durationMs;

  // If we navigate away mid-record, abort cleanly.
  useEffect(() => {
    const r = recorderRef.current;
    return () => r.cancel();
  }, []);

  async function startRecording() {
    onRecordingStart();
    setStatus("");
    try {
      await recorderRef.current.start();
      setRecording(true);
      onRecordingChange(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not start recording.");
    }
  }

  async function stopAndSave() {
    try {
      const rec = await recorderRef.current.stop();
      setRecording(false);
      onRecordingChange(false);
      if (props.mode === "draft") {
        props.onDraftChange(rec);
        return;
      }
      setStatus("Saving…");
      await save.mutateAsync({ tune: props.tune, recording: rec });
      setStatus("");
    } catch (err) {
      setRecording(false);
      onRecordingChange(false);
      setStatus(err instanceof Error ? err.message : "Could not save recording.");
    }
  }

  async function removeRecording() {
    if (props.mode === "draft") {
      props.onDraftChange(null);
      return;
    }
    if (!confirm("Delete this recording?")) return;
    setStatus("Deleting…");
    try {
      await del.mutateAsync(props.tune);
      setStatus("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not delete recording.");
    }
  }

  if (!supported) {
    return (
      <div className="rec-block">
        <div className="rec-status">Recording isn’t supported in this browser.</div>
      </div>
    );
  }

  const idleStatus = hasRecording
    ? props.mode === "draft"
      ? `Recording ready${durationMs ? ` · ${fmtDuration(durationMs)}` : ""}`
      : `Saved recording${durationMs ? ` · ${fmtDuration(durationMs)}` : ""}`
    : "No recording yet";

  return (
    <div className="rec-block">
      <div className="rec-controls">
        {!recording ? (
          <button
            className="rec-btn"
            onClick={startRecording}
            disabled={metronomeRunning || save.isPending}
            title={metronomeRunning ? "Stop the metronome first" : undefined}
          >
            <span className="rec-dot" style={{ color: "var(--red)" }} />
            {hasRecording ? "Re-record" : "Record"}
          </button>
        ) : (
          <button className="rec-btn recording" onClick={stopAndSave}>
            <span className="rec-dot rec-blink" />
            Stop &amp; save
          </button>
        )}

        {hasRecording && !recording && (
          <button className="rec-btn danger-text" onClick={removeRecording} disabled={del.isPending}>
            {props.mode === "draft" ? "Discard" : "Delete"}
          </button>
        )}
      </div>

      {hasRecording && playbackUrl && !recording && (
        <audio className="rec-player" controls src={playbackUrl} preload="none" />
      )}

      <div className="rec-status">
        {status || (recording ? "Recording…" : idleStatus)}
      </div>
    </div>
  );
}
