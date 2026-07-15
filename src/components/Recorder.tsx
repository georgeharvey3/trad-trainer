import { useEffect, useRef, useState } from "react";
import { isRecordingSupported, TuneRecorder } from "../lib/recorder";
import { useDeleteRecording, useRecordingUrl, useSaveRecording } from "../hooks/useRecording";
import type { Tune } from "../lib/types";

interface Props {
  tune: Tune;
  /** True while the metronome is running — recording is disabled then. */
  metronomeRunning: boolean;
  /** Called when recording starts, so the parent can stop the metronome. */
  onRecordingStart: () => void;
  /** Called when recording state changes, so the parent can gate the metronome. */
  onRecordingChange: (recording: boolean) => void;
}

function fmtDuration(ms: number | null): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Recorder({ tune, metronomeRunning, onRecordingStart, onRecordingChange }: Props) {
  const recorderRef = useRef<TuneRecorder>(new TuneRecorder());
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string>("");
  const save = useSaveRecording();
  const del = useDeleteRecording();
  const { data: playbackUrl } = useRecordingUrl(tune.recordingPath);

  const supported = isRecordingSupported();

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
      setStatus("Saving…");
      await save.mutateAsync({ tune, recording: rec });
      setStatus("");
    } catch (err) {
      setRecording(false);
      onRecordingChange(false);
      setStatus(err instanceof Error ? err.message : "Could not save recording.");
    }
  }

  async function deleteRecording() {
    if (!confirm("Delete this recording?")) return;
    setStatus("Deleting…");
    try {
      await del.mutateAsync(tune);
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
            {tune.recordingPath ? "Re-record" : "Record"}
          </button>
        ) : (
          <button className="rec-btn recording" onClick={stopAndSave}>
            <span className="rec-dot rec-blink" />
            Stop &amp; save
          </button>
        )}

        {tune.recordingPath && !recording && (
          <button className="rec-btn danger-text" onClick={deleteRecording} disabled={del.isPending}>
            Delete
          </button>
        )}
      </div>

      {tune.recordingPath && playbackUrl && !recording && (
        <audio className="rec-player" controls src={playbackUrl} preload="none" />
      )}

      <div className="rec-status">
        {status ||
          (recording
            ? "Recording…"
            : tune.recordingPath
              ? `Saved recording${tune.recordingDurationMs ? ` · ${fmtDuration(tune.recordingDurationMs)}` : ""}`
              : "No recording yet")}
      </div>
    </div>
  );
}
