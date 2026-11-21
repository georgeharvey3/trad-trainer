import { useState } from "react";
import { TUNE_TYPES, type Tune, type TuneType } from "../lib/types";
import { DEFAULT_BEATS, LEARN_TEMPOS, targetTempo } from "../lib/srs";
import { useAddTune, useDeleteTune, useTunes, useUpdateTune } from "../hooks/useTunes";
import { useSaveRecording } from "../hooks/useRecording";
import { useSettings } from "../hooks/useSettings";
import type { Recording } from "../lib/recorder";
import { isYouTubeUrl } from "../lib/youtube";
import { useNav } from "../nav";
import { Recorder } from "./Recorder";
import { Sheet, Stepper, Switch } from "./ui";
import { AlertIcon } from "./Icons";

interface Props {
  /** The tune to edit, or null to add one. */
  tuneId: string | null;
  initialTitle?: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Add or edit a tune: a full-height sheet with Cancel and Save on top. */
export function TuneEditor({ tuneId, initialTitle, onClose, onDeleted }: Props) {
  const tunesQ = useTunes();
  const settingsQ = useSettings();
  const tune = tuneId ? (tunesQ.data ?? []).find((t) => t.id === tuneId) ?? null : null;
  if (tuneId && !tune) return null;
  return (
    <Form
      key={tune?.id ?? "new"}
      tune={tune}
      initialTitle={initialTitle}
      targets={settingsQ.data?.targets ?? {}}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  );
}

function Form({
  tune,
  initialTitle,
  targets,
  onClose,
  onDeleted,
}: {
  tune: Tune | null;
  initialTitle?: string;
  targets: Record<string, number>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const nav = useNav();
  const tunesQ = useTunes();
  const add = useAddTune();
  const update = useUpdateTune();
  const del = useDeleteTune();
  const saveRecording = useSaveRecording();

  const [title, setTitle] = useState(tune?.title ?? initialTitle ?? "");
  const [type, setType] = useState<TuneType>(tune?.type ?? "Reel");
  const [tempo, setTempo] = useState<number>(tune?.tempo ?? LEARN_TEMPOS.Reel);
  const [referenceUrl, setReferenceUrl] = useState(tune?.referenceUrl ?? "");
  const [learning, setLearning] = useState(false);
  const [draft, setDraft] = useState<Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [tried, setTried] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cleanTitle = title.trim();
  const cleanRef = referenceUrl.trim();
  const titleError = tried && !cleanTitle ? "Give the tune a title." : null;
  const urlError = cleanRef && !isYouTubeUrl(cleanRef) ? "That isn’t a YouTube link. Paste one from youtube.com or youtu.be, or leave it empty." : null;
  const target = targetTempo(targets, type);
  const busy = add.isPending || update.isPending || del.isPending || saveRecording.isPending || recording;

  function onTypeChange(next: TuneType) {
    setType(next);
    if (!tune) setTempo(LEARN_TEMPOS[next] || 100);
  }

  async function onSave() {
    setTried(true);
    setSaveError(null);
    setDuplicateId(null);
    if (!cleanTitle || urlError) return;
    // Pulses per bar follow from the type (jig 6/8 → 2, slip jig → 3, reel → 4).
    const beats = DEFAULT_BEATS[type] || 4;
    try {
      if (tune) {
        await update.mutateAsync({ id: tune.id, patch: { title: cleanTitle, type, tempo, beats, referenceUrl: cleanRef || null } });
      } else {
        const created = await add.mutateAsync({
          title: cleanTitle,
          type,
          tempo,
          beats,
          referenceUrl: cleanRef || null,
          stage: learning ? "learning" : "rotation",
        });
        if (draft) await saveRecording.mutateAsync({ tune: created, recording: draft });
      }
      onClose();
    } catch (err) {
      const e = err as { message?: string; code?: string } | null;
      const msg = e?.message || "";
      if (e?.code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
        const existing = (tunesQ.data ?? []).find(
          (t) => t.id !== tune?.id && t.title.toLowerCase() === cleanTitle.toLowerCase() && t.type === type,
        );
        setDuplicateId(existing?.id ?? null);
        setSaveError(`You already have a ${type.toLowerCase()} called “${cleanTitle}”.`);
      } else {
        setSaveError(`Couldn’t save. ${msg || "Check your connection and try again."}`);
      }
    }
  }

  async function onDelete() {
    if (!tune) return;
    setConfirmDelete(false);
    await del.mutateAsync(tune.id);
    onDeleted();
  }

  return (
    <Sheet full label={tune ? "Edit tune" : "New tune"} onClose={() => !busy && onClose()}>
      <div className="sheet-head">
        <button className="btn btn-quiet" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <span className="mast-title" style={{ fontSize: "1.0625rem" }}>
          {tune ? "Edit tune" : "New tune"}
        </span>
        <button className="btn btn-text" onClick={onSave} disabled={busy || (!cleanTitle && !tried)}>
          {add.isPending || update.isPending || saveRecording.isPending ? <span className="spinner" /> : "Save"}
        </button>
      </div>
      <div className="sheet-body">
        <div className="stack gap-lg" style={{ maxWidth: 520, margin: "0 auto" }}>
          {saveError && (
            <div className="banner error" role="alert">
              <AlertIcon />
              <span>
                {saveError}{" "}
                {duplicateId ? (
                  <>
                    <button
                      className="link"
                      onClick={() => {
                        onClose();
                        nav.openTune(duplicateId);
                      }}
                    >
                      Open it
                    </button>{" "}
                    or give this one a different name.
                  </>
                ) : null}
              </span>
            </div>
          )}

          {tune?.libraryTuneId && (
            <div className="hrow gap-xs">
              <span className="tag neutral">From the Library</span>
              <span className="small">Sheet music and playback included</span>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="te-title">
              Title
            </label>
            <input
              id="te-title"
              className="input"
              type="text"
              autoComplete="off"
              placeholder="e.g. The Maid Behind the Bar"
              value={title}
              aria-invalid={!!titleError || !!duplicateId}
              aria-describedby={titleError ? "te-title-err" : undefined}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!tune}
            />
            {titleError && (
              <span id="te-title-err" className="err">
                {titleError}
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="te-type">
              Type
            </label>
            <select id="te-type" className="input" value={type} onChange={(e) => onTypeChange(e.target.value as TuneType)}>
              {(TUNE_TYPES.includes(type) ? TUNE_TYPES : [type, ...TUNE_TYPES]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="hint">
              {DEFAULT_BEATS[type] || 4} pulses a bar — set by the type.
            </span>
          </div>

          <div className="field">
            <span className="label" id="te-tempo-label">
              {tune ? "Tempo" : "Starting tempo"}
            </span>
            <div className="hrow gap-sm">
              <Stepper value={tempo} onChange={setTempo} min={30} max={300} step={2} label="Tempo" />
              <span className="small">BPM</span>
            </div>
            <span className="hint">
              {tune
                ? `Your ${type.toLowerCase()} target is ${target}.`
                : `New ${type.toLowerCase()}s start at ${LEARN_TEMPOS[type] || 100}. It climbs toward your target of ${target}.`}
            </span>
          </div>

          <div className="field">
            <label className="label" htmlFor="te-url">
              Reference video <span className="opt">· optional</span>
            </label>
            <input
              id="te-url"
              className="input"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="Paste a YouTube link"
              value={referenceUrl}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? "te-url-err" : undefined}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
            {urlError && (
              <span id="te-url-err" className="err">
                {urlError}
              </span>
            )}
          </div>

          {!tune && (
            <div className="hrow gap-md">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>I’m still learning it</div>
                <div className="small">Keep it out of the daily review until you record a full take.</div>
              </div>
              <Switch checked={learning} onChange={setLearning} label="I’m still learning it" />
            </div>
          )}

          <div className="field">
            <span className="label">
              Your take <span className="opt">· optional</span>
            </span>
            {tune ? (
              <Recorder mode="saved" tune={tune} onRecordingChange={setRecording} />
            ) : (
              <Recorder mode="draft" draft={draft} onDraftChange={setDraft} onRecordingChange={setRecording} />
            )}
          </div>

          {tune && (
            <button className="btn btn-danger btn-block mt-md" onClick={() => setConfirmDelete(true)} disabled={busy}>
              Delete tune
            </button>
          )}
        </div>
      </div>

      {confirmDelete && tune && (
        <Sheet label="Delete tune" role="alertdialog" onClose={() => setConfirmDelete(false)}>
          <div className="h2">Delete {tune.title}?</div>
          <p className="lede mt-xs">
            This removes its practice history{tune.recordingPath ? " and your take" : ""}.
            {tune.libraryTuneId ? " You can add it again from the Library, but it will start from scratch." : ""}
          </p>
          <div className="stack gap-sm mt-lg">
            <button className="btn btn-secondary btn-block btn-lg" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            <button className="btn btn-danger-fill btn-block" onClick={onDelete}>
              Delete tune
            </button>
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}
