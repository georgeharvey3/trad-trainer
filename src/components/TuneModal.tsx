import { useState } from "react";
import { TUNE_TYPES, type Tune, type TuneType } from "../lib/types";
import { DEFAULT_BEATS, LEARN_TEMPOS } from "../lib/srs";
import { useAddTune, useDeleteTune, useUpdateTune } from "../hooks/useTunes";
import { useSaveRecording } from "../hooks/useRecording";
import type { Recording } from "../lib/recorder";
import { isYouTubeUrl } from "../lib/youtube";
import { Recorder } from "./Recorder";

interface Props {
  open: boolean;
  tune: Tune | null; // null → add mode
  onClose: () => void;
}

/** Outer shell owns the backdrop; the form is remounted per open via `key`. */
export function TuneModal({ open, tune, onClose }: Props) {
  return (
    <div
      className={`modal-bg${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && <TuneForm key={tune?.id ?? "new"} tune={tune} onClose={onClose} />}
    </div>
  );
}

function TuneForm({ tune, onClose }: { tune: Tune | null; onClose: () => void }) {
  const add = useAddTune();
  const update = useUpdateTune();
  const del = useDeleteTune();
  const saveRecording = useSaveRecording();

  // Initialised once from props; the parent remounts this form when `tune` changes.
  const [title, setTitle] = useState(tune?.title ?? "");
  const [type, setType] = useState<TuneType>(tune?.type ?? "Reel");
  const [tempo, setTempo] = useState<number>(tune?.tempo ?? LEARN_TEMPOS["Reel"]);
  const [referenceUrl, setReferenceUrl] = useState(tune?.referenceUrl ?? "");
  const [isRecording, setIsRecording] = useState(false);
  // Add mode only: a recording captured before the tune exists, uploaded on save.
  const [draft, setDraft] = useState<Recording | null>(null);

  function onTypeChange(next: TuneType) {
    setType(next);
    if (!tune) {
      setTempo(LEARN_TEMPOS[next] || 100);
    }
  }

  async function onSave() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !tempo || tempo < 30 || tempo > 300) {
      alert("Give the tune a title and a tempo between 30 and 300.");
      return;
    }
    const cleanRef = referenceUrl.trim();
    if (cleanRef && !isYouTubeUrl(cleanRef)) {
      alert("That doesn't look like a YouTube link. Paste a youtube.com or youtu.be URL, or clear the field.");
      return;
    }
    // Pulses per bar is fully determined by the tune type (jig 6/8 → 2,
    // slip jig/waltz → 3, reel/hornpipe/polka → 4), so derive it rather than
    // asking for it.
    const beats = DEFAULT_BEATS[type] || 4;
    try {
      if (tune) {
        await update.mutateAsync({
          id: tune.id,
          patch: { title: cleanTitle, type, tempo, beats, referenceUrl: cleanRef || null },
        });
      } else {
        const created = await add.mutateAsync({
          title: cleanTitle,
          type,
          tempo,
          beats,
          referenceUrl: cleanRef || null,
        });
        if (draft) {
          await saveRecording.mutateAsync({ tune: created, recording: draft });
        }
      }
      onClose();
    } catch (err) {
      // Supabase throws a plain PostgrestError object ({ message, code, details }),
      // not an Error instance, so pull the fields out explicitly.
      const e = err as { message?: string; code?: string; details?: string } | null;
      const msg = e?.message || (err instanceof Error ? err.message : "") || "Unknown error";
      // 23505 = unique_violation: another tune already has this exact title + type
      // (the tunes_user_title_type_key unique index).
      const dup = e?.code === "23505" || /duplicate key|unique constraint/i.test(msg);
      alert(
        dup
          ? `Couldn't save: another tune already exists with the title "${cleanTitle}" and type "${type}". Rename or remove the duplicate.`
          : `Couldn't save: ${msg}${e?.details ? ` (${e.details})` : ""}`,
      );
    }
  }

  async function onDelete() {
    if (!tune) return;
    if (!confirm(`Delete "${tune.title}"? This removes its practice history and recording.`)) return;
    await del.mutateAsync(tune.id);
    onClose();
  }

  const busy =
    add.isPending || update.isPending || del.isPending || saveRecording.isPending || isRecording;

  return (
    <div className="modal">
      <h3>{tune ? "Edit tune" : "Add tune"}</h3>
      <div className="field">
        <label>Title</label>
        <input type="text" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Type</label>
        <select value={type} onChange={(e) => onTypeChange(e.target.value as TuneType)}>
          {TUNE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Current practice tempo (BPM)</label>
        <input
          type="number"
          min={30}
          max={300}
          value={tempo}
          onChange={(e) => setTempo(parseInt(e.target.value, 10) || 0)}
        />
      </div>
      <div className="field">
        <label>Reference video (YouTube URL, optional)</label>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://youtu.be/…"
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
        />
      </div>
      {tune ? (
        <Recorder
          mode="saved"
          tune={tune}
          metronomeRunning={false}
          onRecordingStart={() => {}}
          onRecordingChange={setIsRecording}
        />
      ) : (
        <Recorder
          mode="draft"
          draft={draft}
          onDraftChange={setDraft}
          metronomeRunning={false}
          onRecordingStart={() => {}}
          onRecordingChange={setIsRecording}
        />
      )}
      <div className="modal-actions">
        {tune && (
          <button className="m-delete" onClick={onDelete} disabled={busy}>
            Delete
          </button>
        )}
        <button className="m-cancel" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="m-save" onClick={onSave} disabled={busy}>
          Save
        </button>
      </div>
    </div>
  );
}
