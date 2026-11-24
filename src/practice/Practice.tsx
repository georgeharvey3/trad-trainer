/**
 * Practice in music-stand mode. The phone sits on a stand a metre away while
 * both hands hold the instrument, so the screen is big type and few taps:
 *
 *   count-in → playing → Done → "How did it go?" → between tunes → … → summary
 *
 * Grades are hidden while playing so none is hit by accident. Keys 1–4 grade,
 * and Space, Enter, PageDown or → (what page-turner pedals send) press the one
 * big button on screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGradeTune, useTunes, useUndoGrade, useUpdateTune, useLibraryTune, type GradeOutcome } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { useSession } from "../hooks/useSession";
import { useMetronome } from "../hooks/useMetronome";
import { dueTunes, pickNext, recordResult, skipTune, slotsLeft, undoResult } from "../lib/session";
import { metronome } from "../lib/metronome";
import { backIn, summarize } from "../lib/progress";
import { targetTempo } from "../lib/srs";
import { formatKey } from "../lib/library";
import { tuneAbc } from "../lib/abc";
import { abcPlayback } from "../lib/abcPlayback";
import type { Grade, Session, Settings, Tune } from "../lib/types";
import type { PracticeOptions } from "../nav";
import { useNav } from "../nav";
import { copy } from "../copy";
import { Sheet } from "../components/ui";
import { useWakeLock } from "../hooks/useWakeLock";
import { AbcPlayer } from "../components/AbcPlayer";
import { AbcScore } from "../components/AbcScore";
import { ReferencePlayer } from "../components/ReferencePlayer";
import { Recorder } from "../components/Recorder";
import { CloseIcon, NotesIcon, PauseIcon, PlayIcon, SunIcon, VideoIcon } from "../components/Icons";

type Phase = "next" | "countin" | "playing" | "grading" | "summary";
type Tool = "notes" | "video" | "record" | null;

const PEDAL_KEYS = new Set([" ", "Enter", "PageDown", "ArrowRight"]);

export function Practice({ opts, onClose }: { opts: PracticeOptions; onClose: () => void }) {
  const tunesQ = useTunes();
  const settingsQ = useSettings();
  const settings = settingsQ.data;
  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);

  if (!settings || tunesQ.isLoading) {
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Practice">
        <div className="center-note">Loading…</div>
      </div>
    );
  }
  return <PracticeRun tunes={tunes} settings={settings} opts={opts} onClose={onClose} />;
}

function PracticeRun({ tunes, settings, opts, onClose }: { tunes: Tune[]; settings: Settings; opts: PracticeOptions; onClose: () => void }) {
  const [session, setSession] = useSession();
  const gradeTune = useGradeTune();
  const undoGrade = useUndoGrade();
  const updateTune = useUpdateTune();
  const metro = useMetronome();
  const nav = useNav();
  useWakeLock(settings.keepAwake);

  const single = opts.tuneId ?? null;
  const next = useCallback(
    (s: Session, exclude: string | null) => (single ? null : pickNext(tunes, s, settings, exclude)),
    [single, tunes, settings],
  );

  const [currentId, setCurrentId] = useState<string | null>(() => single ?? next(session, null)?.id ?? null);
  const [rawPhase, setPhase] = useState<Phase>(() => (currentId ? (settings.countIn ? "countin" : "playing") : "summary"));
  const [last, setLast] = useState<GradeOutcome | null>(null);
  const [lastTitle, setLastTitle] = useState("");
  const [tool, setTool] = useState<Tool>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  const tune = tunes.find((t) => t.id === currentId) ?? null;
  const sitting = useRef<string[]>([]);

  useEffect(() => () => metro.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Count-in: one bar of clicks (two for tunes with two beats a bar). It ends
  // on the first beat after the count, and the click plays on without a break.
  const countTotal = tune ? (tune.beats <= 2 ? tune.beats * 2 : tune.beats) : 4;
  const counted = rawPhase === "countin" && metro.running ? metro.count : 0;
  // Adjusting state while rendering (not in an effect): React re-renders at once.
  if (rawPhase === "countin" && counted > countTotal) setPhase("playing");
  const phase: Phase = rawPhase === "countin" && counted > countTotal ? "playing" : rawPhase;

  // The click runs through the count-in and on into playing without a break,
  // and stops everywhere else. The tempo follows nudges via setBpm.
  const clickOn = !!tune && (rawPhase === "countin" || rawPhase === "playing") && !paused && !recording;
  useEffect(() => {
    if (clickOn && tune) {
      if (!metronome.running) metro.start(tune.tempo, tune.beats);
    } else {
      metro.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickOn, tune?.id]);

  function begin() {
    setPaused(false);
    setPhase(settings.countIn ? "countin" : "playing");
  }

  function done() {
    metro.stop();
    abcPlayback.stop();
    setTool(null);
    setPhase("grading");
  }

  async function grade(g: Grade) {
    if (!tune || busy) return;
    setBusy(true);
    try {
      const outcome = await gradeTune(tune, g, settings);
      const s = recordResult(session, outcome);
      setSession(s);
      sitting.current.push(tune.id);
      setLast(outcome);
      setLastTitle(tune.title);
      const n = next(s, tune.id);
      setCurrentId(n?.id ?? null);
      setPhase(n ? "next" : "summary");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    if (!tune) return;
    metro.stop();
    const s = skipTune(session, tune.id);
    setSession(s);
    setLast(null);
    const n = next(s, tune.id);
    setCurrentId(n?.id ?? null);
    setPhase(n ? "next" : "summary");
  }

  async function undo() {
    if (!last) return;
    const outcome = last;
    setLast(null);
    setSession(undoResult(session, outcome.tuneId));
    sitting.current = sitting.current.filter((id) => id !== outcome.tuneId);
    setCurrentId(outcome.tuneId);
    setPhase("next");
    await undoGrade(outcome);
  }

  function nudge(d: number) {
    if (!tune) return;
    const target = targetTempo(settings.targets, tune.type);
    const tempo = Math.min(Math.max(target, tune.tempo), Math.max(30, tune.tempo + d));
    updateTune.mutate({ id: tune.id, patch: { tempo } });
    metro.setBpm(tempo);
  }

  // Keyboard and pedals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tool || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (phase === "grading" && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        void grade(copy.grades[Number(e.key) - 1].g);
      } else if (PEDAL_KEYS.has(e.key) && !(target && target.tagName === "BUTTON" && (e.key === " " || e.key === "Enter"))) {
        if (phase === "playing") {
          e.preventDefault();
          done();
        } else if (phase === "next") {
          e.preventDefault();
          begin();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // "Tune 5 of 7": graded today, plus what's left of today's set.
  const position = session.done.length + (tune && !session.done.includes(tune.id) ? 1 : 0);
  const remaining = Math.min(slotsLeft(session, settings), dueTunes(tunes, session).length);
  const total = single ? 1 : Math.max(position, session.done.length + remaining);

  const pips = (
    <div className="stand-pips">
      <div className="pips" aria-hidden="true">
        {session.results.map((r) => (
          <div key={r.tuneId} className={`pip ${r.grade}`} />
        ))}
        {Array.from({ length: Math.max(0, total - session.results.length) }, (_, i) => (
          <div key={i} className={`pip${i === 0 && phase !== "summary" ? " now" : ""}`} />
        ))}
      </div>
    </div>
  );

  const top = (right: ReactNode) => (
    <div className="stand-top">
      <div className="side">
        <button className="icon-btn ghost" aria-label="Leave practice" disabled={recording} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <span className="eyebrow ink num" aria-live="polite">
        {phase === "summary" ? "Session" : single ? "One tune" : `Tune ${position} of ${total}`}
      </span>
      <div className="side end">{right}</div>
    </div>
  );

  // ---------------------------------------------------------------- summary
  if (phase === "summary" || !tune) {
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Session done">
        {top(null)}
        <Summary session={session} tunes={tunes} single={!!single} onClose={onClose} onLearn={(id) => { onClose(); nav.openLearning(id); }} />
      </div>
    );
  }

  const target = targetTempo(settings.targets, tune.type);
  const atTarget = tune.tempo >= target;
  const keyText = tune.libraryTuneId ? <LibraryKey id={tune.libraryTuneId} /> : null;

  // ---------------------------------------------------------------- between tunes
  if (phase === "next") {
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Next tune">
        {top(null)}
        {!single && pips}
        <div className="stand-body">
          {last && (
            <div
              className="shelf"
              style={{
                borderColor: `var(--color-${last.grade}-border)`,
                background: `var(--color-${last.grade}-tint)`,
                color: `var(--color-${last.grade})`,
              }}
              role="status"
            >
              <span className={`tag g-${last.grade}`}>{copy.gradeLabel[last.grade]}</span>
              <div className="grow">
                <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>{lastTitle}</div>
                <div className="small num" style={{ color: "inherit" }}>
                  {last.tempoBefore === last.tempoAfter ? `held at ${last.tempoAfter} BPM` : `${last.tempoBefore} → ${last.tempoAfter} BPM`} · {backIn(last.due)}
                </div>
              </div>
              <button className="btn btn-quiet btn-sm" style={{ color: "inherit" }} onClick={undo}>
                Undo
              </button>
            </div>
          )}
          <div className="stack gap-xs" style={{ marginTop: "min(72px, 8vh)" }}>
            <span className="eyebrow accent">Up next</span>
            <h1 className="display" style={{ fontSize: "2.875rem" }}>
              {tune.title}
            </h1>
            <div className="hrow gap-xs" style={{ flexWrap: "wrap" }}>
              <span className="tag neutral">{tune.type}</span>
              {keyText && <span className="tag neutral">{keyText}</span>}
              <span className="mono" style={{ fontWeight: 600 }}>
                {tune.tempo} BPM
              </span>
            </div>
            <p className="small mt-xs">
              {[tune.libraryTuneId && "Sheet music ready", tune.referenceUrl && "Reference video", tune.recordingPath && "Your last take"]
                .filter(Boolean)
                .join(" · ") || "Just you and the click"}
            </p>
          </div>
          <div className="stack gap-xs push pt-lg">
            <button className="done-btn" onClick={begin}>
              {settings.countIn ? (
                <>
                  Count me in <span className="hint-keys">{Array.from({ length: Math.min(4, countTotal) }, (_, i) => i + 1).join(" ")}</span>
                </>
              ) : (
                "Start"
              )}
            </button>
            {!single && (
              <button className="btn btn-quiet btn-block" onClick={skip}>
                Skip for today
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- count-in
  if (phase === "countin") {
    const shown = Math.min(Math.max(counted, 1), countTotal);
    const beatInBar = ((shown - 1) % tune.beats) + 1;
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Count-in">
        {top(
          settings.keepAwake ? (
            <span className="hrow small gap-2xs">
              <SunIcon />
              Stays on
            </span>
          ) : null,
        )}
        <div className="stand-body center" style={{ alignItems: "center" }}>
          <div className="h2 mt-xl" style={{ fontSize: "1.625rem" }}>
            {tune.title}
          </div>
          <div className="small mt-xs">
            {tune.type} · {tune.tempo} BPM
          </div>
          <div className="countin mt-lg" aria-live="assertive">
            {counted === 0 ? "·" : beatInBar}
          </div>
          <div className="beatbar mt-lg" style={{ width: "100%" }} aria-hidden="true">
            {Array.from({ length: tune.beats }, (_, i) => (
              <i key={i} className={counted > 0 && i < beatInBar ? "on" : i === 0 ? "first" : ""} />
            ))}
          </div>
          <p className="small mt-sm">Get ready… the tune starts after the count.</p>
          {metro.silent && <p className="small mt-sm" role="status">No sound? Tap anywhere to turn the click on.</p>}
          <button className="btn btn-quiet push" onClick={() => setPhase("next")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- playing (+ grading sheet)
  const beatIdx = metro.beat?.idx ?? -1;
  const beatbar = (
    <div className="beatbar" aria-hidden="true">
      {Array.from({ length: tune.beats }, (_, i) => (
        <i key={i} className={i === beatIdx ? "on" : i === 0 ? "first" : ""} />
      ))}
    </div>
  );
  const nudges = (
    <>
      <button className="big-ctl" aria-label="Slower by 2 BPM" onClick={() => nudge(-2)} disabled={tune.tempo <= 30}>
        −2
      </button>
      <button className="big-ctl" aria-label="Faster by 2 BPM" onClick={() => nudge(2)} disabled={atTarget}>
        +2
      </button>
    </>
  );

  return (
    <div className={`stand${tune.libraryTuneId ? " has-score" : ""}`} role="dialog" aria-modal="true" aria-label={`Playing ${tune.title}`}>
      {top(
        !single ? (
          <button className="btn btn-quiet" onClick={skip} disabled={recording}>
            Skip
          </button>
        ) : null,
      )}
      {!single && pips}

      <div className="stand-body stand-portrait">
        <div className="eyebrow accent">
          {tune.type}
          {keyText && <> · {keyText}</>}
        </div>
        <h1 className="display" style={{ fontSize: "2.125rem", marginTop: 4 }}>
          {tune.title}
        </h1>
        <div className="mt-lg">{beatbar}</div>
        <div className="hrow between mt-md" style={{ alignItems: "flex-end" }}>
          <div className="bpm-xl" aria-label={`${tune.tempo} beats a minute`}>
            {tune.tempo}
          </div>
          <div className="stack gap-2xs" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
            <span className="eyebrow">BPM</span>
            <span className="small num">{atTarget ? "At target" : `Target ${target}`}</span>
          </div>
        </div>
        <div className={`bar mt-sm${atTarget ? " at-target" : ""}`}>
          <i style={{ width: `${Math.min(100, (tune.tempo / target) * 100)}%` }} />
        </div>
        <div className="ctl3 mt-md">
          <button className="big-ctl" aria-label="Slower by 2 BPM" onClick={() => nudge(-2)} disabled={tune.tempo <= 30}>
            −2
          </button>
          <button
            className="big-ctl"
            aria-label={paused ? "Start the click" : "Pause the click"}
            disabled={recording}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
          </button>
          <button className="big-ctl" aria-label="Faster by 2 BPM" onClick={() => nudge(2)} disabled={atTarget}>
            +2
          </button>
        </div>
        <div className="tools3 mt-sm">
          <button className="btn btn-secondary btn-sm" onClick={() => setTool("notes")}>
            <NotesIcon />
            Notes
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setTool("video")}>
            <VideoIcon />
            Video
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setTool("record")}>
            <span className="rec-dot" />
            {recording ? "Recording" : "Record"}
          </button>
        </div>
        {metro.silent && (
          <p className="small center mt-sm" role="status">
            No sound? Tap anywhere to turn the click on.
          </p>
        )}
        {tune.libraryTuneId && <p className="small center mt-sm">Turn the phone sideways for the full sheet music</p>}
        <div className="push pt-lg">
          <button className="done-btn" onClick={done} disabled={recording}>
            Done
          </button>
        </div>
      </div>

      {tune.libraryTuneId && (
        <div className="stand-land">
          <div className="stand-rail">
            <div className="h2" style={{ fontSize: "1.25rem" }}>
              {tune.title}
            </div>
            <div className="hrow gap-xs" style={{ alignItems: "baseline" }}>
              <span className="bpm-xl">{tune.tempo}</span>
              <span className="eyebrow">BPM</span>
            </div>
            {beatbar}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{nudges}</div>
            <button className="done-btn push" onClick={done} disabled={recording}>
              Done
            </button>
          </div>
          <div className="stand-score">
            <LandscapeScore id={tune.libraryTuneId} tune={tune} />
          </div>
        </div>
      )}

      {tool === "notes" && (
        <Sheet label="Sheet music" onClose={() => setTool(null)}>
          <div className="h2 pb-md">Sheet music</div>
          {tune.libraryTuneId ? (
            <AbcPlayer
              libraryTuneId={tune.libraryTuneId}
              type={tune.type}
              beats={tune.beats}
              tempo={tune.tempo}
              disabled={recording}
              onPlay={() => metro.stop()}
            />
          ) : (
            <p className="lede">Only tunes from the Library have sheet music.</p>
          )}
        </Sheet>
      )}
      {tool === "video" && (
        <Sheet label="Reference video" onClose={() => setTool(null)}>
          <div className="h2 pb-md">Reference video</div>
          {tune.referenceUrl ? (
            <ReferencePlayer url={tune.referenceUrl} onPlay={() => setPaused(true)} />
          ) : (
            <p className="lede">No video yet. Add a YouTube link from the tune’s page after practice.</p>
          )}
        </Sheet>
      )}
      {tool === "record" && (
        <Sheet label="Record a take" onClose={() => !recording && setTool(null)}>
          <div className="h2 pb-md">Your take</div>
          <Recorder
            mode="saved"
            tune={tune}
            onRecordingStart={() => {
              setPaused(true);
              abcPlayback.stop();
            }}
            onRecordingChange={setRecording}
          />
          <p className="small mt-sm">The click stops while you record.</p>
        </Sheet>
      )}

      {phase === "grading" && (
        <Sheet label={`How did ${tune.title} go?`} onClose={() => begin()}>
          <h2 className="h2">How did {tune.title} go?</h2>
          <div className="stack gap-xs mt-md">
            {copy.grades.map(({ g, label, line }, i) => (
              <button key={g} className={`gopt g-${g}`} disabled={busy} onClick={() => void grade(g)}>
                <span className="gkey" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="grow">
                  <b>{label}</b>
                  <span className="gopt-line">{line}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="hrow between mt-xs">
            <button className="btn btn-quiet" onClick={begin}>
              Play it again
            </button>
            {!single && (
              <button className="btn btn-quiet" onClick={skip}>
                Skip for today
              </button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function LibraryKey({ id }: { id: string }) {
  const q = useLibraryTune(id);
  return q.data ? <>{formatKey(q.data.key)}</> : null;
}

function LandscapeScore({ id, tune }: { id: string; tune: Tune }) {
  const q = useLibraryTune(id);
  const abc = useMemo(
    () => (q.data?.abc ? tuneAbc({ ...q.data, abc: q.data.abc }, tune.tempo, tune.beats) : null),
    [q.data, tune.tempo, tune.beats],
  );
  if (!abc) return <div className="abc-status">{q.isError ? copy.abcPlayer.loadFailed : copy.abcPlayer.loading}</div>;
  return <AbcScore abc={abc} label={`Sheet music of ${tune.title}`} />;
}

function Summary({
  session,
  tunes,
  single,
  onClose,
  onLearn,
}: {
  session: Session;
  tunes: Tune[];
  single: boolean;
  onClose: () => void;
  onLearn: (id: string) => void;
}) {
  const s = summarize(session.results);
  const best = s.best ? tunes.find((t) => t.id === s.best!.tuneId) : null;
  const slipped = session.results.filter((r) => r.grade === "again");
  const learning = tunes.find((t) => t.stage === "learning");
  const order: Grade[] = ["again", "hard", "good", "easy"];
  const cols = order.filter((g) => s.byGrade[g] > 0);

  return (
    <div className="stand-body">
      <div className="asterism mt-lg" aria-hidden="true">
        * * *
      </div>
      <h1 className="display center mt-sm" style={{ fontSize: "2.375rem" }}>
        {s.count ? "Session done" : "Nothing to play"}
      </h1>
      <p className="lede center mt-xs">
        {s.count
          ? `${s.count} ${s.count === 1 ? "tune" : "tunes"} today.`
          : "Today’s queue is empty."}
      </p>
      {s.count > 0 && (
        <>
          <div className="stats2 mt-lg">
            <div>
              <div className="stat-big" style={{ color: s.totalGain >= 0 ? "var(--color-accent)" : "var(--color-again)" }}>
                {s.totalGain > 0 ? "+" : ""}
                {s.totalGain}
              </div>
              <div className="small">{s.totalGain >= 0 ? "BPM gained in all" : "BPM change in all"}</div>
            </div>
            <div>
              <div className="stat-big">{best ? `+${s.best!.tempoAfter - s.best!.tempoBefore}` : "–"}</div>
              <div className="small">{best ? `best: ${best.title}` : "no tempo gains"}</div>
            </div>
          </div>
          <div className="mt-md">
            <span className="eyebrow">How it went</span>
            <div className="gradesplit mt-sm" style={{ gridTemplateColumns: cols.map((g) => `${s.byGrade[g]}fr`).join(" ") }}>
              {cols.map((g) => (
                <i key={g} style={{ background: `var(--color-${g}-border)` }} />
              ))}
            </div>
            <div className="gradesplit mt-xs" style={{ gridTemplateColumns: cols.map((g) => `${s.byGrade[g]}fr`).join(" "), fontSize: 12, fontWeight: 600 }}>
              {cols.map((g) => (
                <span key={g} style={{ color: `var(--color-${g})`, whiteSpace: "nowrap" }}>
                  {s.byGrade[g]} {copy.gradeLabel[g]}
                </span>
              ))}
            </div>
            {slipped.length > 0 && (
              <p className="small mt-sm">
                {slipped.length === 1
                  ? `${tunes.find((t) => t.id === slipped[0].tuneId)?.title ?? "One tune"} slipped back to ${slipped[0].tempoAfter} BPM. It’s first up tomorrow.`
                  : `${slipped.length} tunes slipped back a little. They’re first up tomorrow.`}
              </p>
            )}
          </div>
        </>
      )}
      <div className="stack gap-sm push pt-lg">
        {learning && !single && (
          <button className="btn btn-primary btn-block btn-lg" onClick={() => onLearn(learning.id)}>
            Ten minutes on {learning.title}?
          </button>
        )}
        <button className={`btn btn-block ${learning && !single ? "btn-quiet" : "btn-primary btn-lg"}`} onClick={onClose}>
          {single ? "Done" : "I’m done for today"}
        </button>
      </div>
    </div>
  );
}
