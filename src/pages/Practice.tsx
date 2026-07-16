import { useMemo, useState } from "react";
import { useTunes, useUpdateTune, useGradeTune } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { useMetronome } from "../hooks/useMetronome";
import {
  dueTunes,
  eligibleTunes,
  loadSession,
  pickNext,
  saveSession,
  sessionCap,
} from "../lib/session";
import { previewInterval } from "../lib/srs";
import type { Grade, Session, Tune } from "../lib/types";
import { Recorder } from "../components/Recorder";
import { ReferencePlayer } from "../components/ReferencePlayer";

const GRADES: { g: Grade; cls: string; label: string }[] = [
  { g: "again", cls: "g-again", label: "Again" },
  { g: "hard", cls: "g-hard", label: "Hard" },
  { g: "good", cls: "g-good", label: "Good" },
  { g: "easy", cls: "g-easy", label: "Easy" },
];

export function Practice() {
  const tunesQ = useTunes();
  const settingsQ = useSettings();
  const updateTune = useUpdateTune();
  const gradeTuneMut = useGradeTune();
  const metro = useMetronome();

  const [session, setSessionState] = useState<Session>(() => loadSession());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);
  const settings = settingsQ.data;

  const setSession = (s: Session) => {
    saveSession(s);
    setSessionState(s);
  };

  const due = useMemo(() => (settings ? dueTunes(tunes, session) : []), [tunes, session, settings]);
  const eligible = useMemo(
    () => (settings ? eligibleTunes(tunes, session, settings) : []),
    [tunes, session, settings],
  );

  if (tunesQ.isLoading || settingsQ.isLoading || !settings) {
    return <div className="center-note">Loading&hellip;</div>;
  }

  const current = tunes.find((t) => t.id === currentId) ?? null;
  const currentEligible = current && eligible.some((t) => t.id === current.id);
  const activeCurrent = currentEligible ? current : null;

  const doneCount = session.done.length;
  const capLeft = Math.max(0, sessionCap(session, settings) - session.served.length);

  function goToNext(excludeId: string | null) {
    metro.stop();
    const next = pickNext(tunes, session, settings!, excludeId);
    if (!next) {
      setCurrentId(null);
      return;
    }
    setCurrentId(next.id);
    if (!session.served.includes(next.id)) {
      setSession({ ...session, served: [...session.served, next.id] });
    }
    // Auto-start the metronome for the new tune (this runs from a user gesture).
    metro.start(next.tempo, next.beats);
  }

  function onGrade(g: Grade) {
    if (!activeCurrent) return;
    const t = activeCurrent;
    void gradeTuneMut(t, g, settings!);
    if (g !== "again" && !session.done.includes(t.id)) {
      setSession({ ...session, done: [...session.done, t.id] });
      goToNext(t.id);
    } else {
      goToNext(g === "again" ? null : t.id);
    }
  }

  function nudgeTempo(t: Tune, d: number) {
    const tempo = Math.min(300, Math.max(30, t.tempo + d));
    updateTune.mutate({ id: t.id, patch: { tempo } });
    metro.setBpm(tempo);
  }

  const stats = (
    <div className="stats">
      <div className="stat">
        <b>{due.length}</b>
        <span>due</span>
      </div>
      <div className="stat">
        <b>{doneCount}</b>
        <span>done today</span>
      </div>
      <div className="stat">
        <b>{capLeft}</b>
        <span>cap left</span>
      </div>
    </div>
  );

  // ---- No active tune: start / caught-up / capped states ----
  if (!activeCurrent) {
    if (eligible.length === 0) {
      const capped = due.length > 0;
      return (
        <>
          {stats}
          <div className="done-msg">
            <div className="orn" aria-hidden="true">* * *</div>
            <h3>{capped ? "Daily cap reached" : "All caught up"}</h3>
            <p>
              {capped
                ? `${due.length} tune${due.length === 1 ? "" : "s"} carry over to tomorrow.`
                : "Nothing due. Come back tomorrow or add a new tune."}
            </p>
            {capped && (
              <button
                className="big-btn secondary one-more"
                onClick={() => {
                  const s = { ...session, extra: (session.extra || 0) + 1 };
                  setSession(s);
                  goToNext(null);
                }}
              >
                Practice one more anyway
              </button>
            )}
          </div>
        </>
      );
    }
    return (
      <>
        {stats}
        <button className="big-btn" onClick={() => goToNext(null)}>
          {doneCount ? "Next tune" : "Start practice"}
        </button>
      </>
    );
  }

  // ---- Active tune card ----
  const t = activeCurrent;
  const target = settings.targets[t.type] ?? "?";
  return (
    <>
      {stats}
      <div className="card">
        <div className="type-chip">{t.type}</div>
        <h2>{t.title}</h2>
        <div className="meter-note">
          {t.beats} pulses/bar &middot; target {target} BPM
        </div>
        <div className="tempo-row">
          <button className="round-btn" onClick={() => nudgeTempo(t, -2)}>
            &minus;
          </button>
          <div className="bpm">
            {t.tempo}
            <small>BPM</small>
          </div>
          <button className="round-btn" onClick={() => nudgeTempo(t, +2)}>
            +
          </button>
        </div>
        <div className="beats" aria-hidden="true">
          {Array.from({ length: t.beats }, (_, i) => {
            const on = metro.beat?.idx === i;
            const accent = on && metro.beat?.accent;
            return <div key={i} className={`dot${on ? " on" : ""}${accent ? " accent" : ""}`} />;
          })}
        </div>
        <button
          className={`play-btn${metro.running ? " playing" : ""}`}
          disabled={isRecording}
          onClick={() => (metro.running ? metro.stop() : metro.start(t.tempo, t.beats))}
        >
          {metro.running ? "■" : "▶"}
        </button>

        {t.referenceUrl && (
          <ReferencePlayer key={t.id} url={t.referenceUrl} onPlay={() => metro.stop()} />
        )}

        <Recorder
          mode="saved"
          tune={t}
          metronomeRunning={metro.running}
          onRecordingStart={() => metro.stop()}
          onRecordingChange={setIsRecording}
        />

        <div className="grades">
          {GRADES.map(({ g, cls, label }) => (
            <button key={g} className={cls} disabled={isRecording} onClick={() => onGrade(g)}>
              {label}
              <small>{previewInterval(t, g, settings.targets)}</small>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
