/**
 * Learning a tune: pick bars on the score, loop them slowed down, mark them
 * learnt. When every bar is learnt (or whenever you feel ready) a full take
 * moves the tune into the rotation. A tune already in the rotation can use
 * the same looping tools from its page, without the learning progress.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as abcjs from "abcjs";
import { useLibraryTune, useTunes, useUpdateTune } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { useMetronome } from "../hooks/useMetronome";
import { tuneAbc } from "../lib/abc";
import { abcPlayback } from "../lib/abcPlayback";
import { addLearnt, barAt, barsOf, chunks, loopAbc, rangeLabel, tapBar, type Bar, type BarRange, type AbcLine } from "../lib/bars";
import { setBarCount } from "../lib/barCount";
import { graduateFields, targetTempo } from "../lib/srs";
import { formatKey } from "../lib/library";
import type { Tune } from "../lib/types";
import { useNav } from "../nav";
import { AbcScore } from "../components/AbcScore";
import { Recorder } from "../components/Recorder";
import { fmtDuration } from "../lib/format";
import { BarStrip } from "../components/ui";
import { useWakeLock } from "../hooks/useWakeLock";
import { BackIcon, CheckIcon, CloseIcon, LoopIcon, StopIcon } from "../components/Icons";
import { copy } from "../copy";

export function Learning({ tuneId, onClose }: { tuneId: string; onClose: () => void }) {
  const tunesQ = useTunes();
  const tune = (tunesQ.data ?? []).find((t) => t.id === tuneId);
  const [graduated, setGraduated] = useState<{ durationMs: number; tempo: number } | null>(null);

  if (graduated && tune) return <Graduated tune={tune} take={graduated} onClose={onClose} />;
  if (!tune) {
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Learning">
        <div className="stand-top">
          <button className="icon-btn ghost" aria-label="Back" onClick={onClose}>
            <BackIcon />
          </button>
        </div>
        <p className="center-note">{tunesQ.isLoading ? "Loading…" : "This tune isn’t in your tunes any more."}</p>
      </div>
    );
  }
  return <LearningRun tune={tune} onClose={onClose} onGraduated={setGraduated} />;
}

function LearningRun({
  tune,
  onClose,
  onGraduated,
}: {
  tune: Tune;
  onClose: () => void;
  onGraduated: (take: { durationMs: number; tempo: number }) => void;
}) {
  const settingsQ = useSettings();
  const libQ = useLibraryTune(tune.libraryTuneId);
  const update = useUpdateTune();
  const metro = useMetronome();
  useWakeLock(settingsQ.data?.keepAwake ?? true);

  const learning = tune.stage === "learning";
  const target = targetTempo(settingsQ.data?.targets ?? {}, tune.type);
  const speeds = useMemo(() => {
    const base = tune.tempo;
    const list = [Math.max(30, base - 12), base, Math.min(target, base + 12), target];
    return [...new Set(list)].sort((a, b) => a - b);
  }, [tune.tempo, target]);
  const [speed, setSpeed] = useState(tune.tempo);
  const [range, setRange] = useState<BarRange | null>(null);
  const [bars, setBars] = useState<Bar[]>([]);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loops, setLoops] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [self] = useState(() => ({}));

  const playing = useSyncExternalStore(
    (fn) => abcPlayback.subscribe(fn),
    () => abcPlayback.isOwner(self),
  );

  const lib = libQ.data;
  const abc = useMemo(
    () => (lib?.abc ? tuneAbc({ ...lib, abc: lib.abc }, speed, tune.beats) : null),
    [lib, speed, tune.beats],
  );

  const total = bars.length;
  const learnt = tune.learntBars;
  const allLearnt = learning && total > 0 && learnt.length >= total;
  const showReady = learning && (ready || allLearnt || (!abc && !libQ.isLoading));
  const loopRange = useMemo(() => range ?? (total ? { from: 1, to: total } : null), [range, total]);
  const loopText = useMemo(() => (abc && bars.length && loopRange ? loopAbc(abc, bars, loopRange) : null), [abc, bars, loopRange]);

  // Colour the bars: the loop in green, learnt bars in a quieter green.
  useEffect(() => {
    const learntSet = new Set(learning ? learnt : []);
    for (const b of bars) {
      const inSel = !!range && b.number >= range.from && b.number <= range.to;
      for (const n of b.notes) {
        for (const el of n.abselem?.elemset ?? []) {
          el.classList.toggle("bar-sel", inSel);
          el.classList.toggle("bar-learnt", !inSel && learntSet.has(b.number));
        }
      }
    }
  }, [bars, range, learnt, learning]);

  // Play the loop; a new loop (other bars, other speed) starts over.
  function playLoop(text: string) {
    if (!hiddenRef.current) return;
    setError(null);
    metro.stop();
    const visual = abcjs.renderAbc(hiddenRef.current, text, {})[0];
    setLoops(0);
    abcPlayback.start(visual, self, { loop: true, onLoop: () => setLoops((l) => l + 1) }).catch(() => setError(copy.abcPlayer.playFailed));
  }
  useEffect(() => {
    if (abcPlayback.isOwner(self) && loopText) playLoop(loopText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopText]);
  useEffect(() => () => abcPlayback.stopIfOwner(self), [self]);
  useEffect(() => {
    if (recording) {
      abcPlayback.stopIfOwner(self);
      metro.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  function markLearnt() {
    if (!range) return;
    update.mutate({ id: tune.id, patch: { learntBars: addLearnt(learnt, range) } });
    setRange(null);
  }

  return (
    <div className="stand" role="dialog" aria-modal="true" aria-label={`Learning ${tune.title}`}>
      <div className="stand-top">
        <div className="side">
          <button className="icon-btn ghost" aria-label="Back" disabled={recording} onClick={onClose}>
            <BackIcon />
          </button>
        </div>
        <span className="eyebrow ink">{learning ? (total ? `Learning · ${learnt.length} of ${total} bars` : "Learning") : "Loop bars"}</span>
        <div className="side" />
      </div>
      <div className="stand-body" style={{ gap: "var(--space-sm)" }}>
        <div>
          <div className="eyebrow accent">
            {tune.type}
            {lib && <> · {formatKey(lib.key)}</>}
          </div>
          <h1 className="display" style={{ fontSize: "1.75rem", marginTop: 2 }}>
            {tune.title}
          </h1>
        </div>

        {showReady ? (
          <ReadyForTake
            tune={tune}
            total={total}
            onBack={abc ? () => setReady(false) : undefined}
            onRecordingChange={setRecording}
            onSaved={(rec) => {
              update.mutate({ id: tune.id, patch: graduateFields(tune.tempo) });
              onGraduated({ durationMs: rec.durationMs, tempo: tune.tempo });
            }}
          />
        ) : !abc ? (
          <div className="abc-status">{libQ.isError ? copy.abcPlayer.loadFailed : copy.abcPlayer.loading}</div>
        ) : (
          <>
            <div className="panel stack gap-2xs" style={{ padding: "10px 10px 6px" }}>
              <div className="hrow between">
                <span className="eyebrow">Score</span>
                <span className="small" style={{ fontSize: 12 }}>
                  Tap a bar, then tap another to stretch the loop
                </span>
              </div>
              <AbcScore
                abc={abc}
                label={`Sheet music of ${tune.title}. Tap a bar to loop it.`}
                onRendered={(v) => {
                  const b = barsOf(v.lines as unknown as AbcLine[]);
                  setBars(b);
                  setBarCount(tune.id, b.length);
                }}
                onPick={(char) => {
                  const n = barAt(bars, char);
                  if (n) setRange((r) => tapBar(r, n));
                }}
              />
            </div>

            <div className="hrow between gap-sm">
              {range ? (
                <span className="chip on" style={{ minHeight: 40, fontSize: 14, paddingRight: 4 }}>
                  <LoopIcon />
                  {rangeLabel(range)}
                  <button className="icon-btn ghost" aria-label="Clear the loop" style={{ width: 32, height: 32, color: "inherit" }} onClick={() => setRange(null)}>
                    <CloseIcon size={14} />
                  </button>
                </span>
              ) : (
                <span className="small">Looping the whole tune</span>
              )}
              {playing && loops > 0 && <span className="small num">{loops + 1}× round</span>}
            </div>

            <div className="chips" role="group" aria-label="Quick picks">
              {chunks(total).map((c) => (
                <button key={c.from} className="chip" aria-pressed={range?.from === c.from && range?.to === c.to} onClick={() => setRange(c)}>
                  {c.from}–{c.to}
                </button>
              ))}
              <button className="chip" aria-pressed={!range} onClick={() => setRange(null)}>
                Whole tune
              </button>
            </div>

            <div className="seg" role="group" aria-label="Speed">
              {speeds.map((s) => (
                <button key={s} aria-pressed={s === speed} onClick={() => setSpeed(s)}>
                  {s === target ? `Target ${s}` : s}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <button
                className="done-btn"
                style={{ minHeight: 56, fontSize: "1rem", background: playing ? "var(--color-accent)" : undefined, color: playing ? "var(--color-accent-ink)" : undefined }}
                disabled={!loopText}
                onClick={() => (playing ? abcPlayback.stop() : loopText && playLoop(loopText))}
              >
                {playing ? <StopIcon size={18} /> : <LoopIcon size={18} />}
                {playing ? "Stop loop" : `Loop ${range ? rangeLabel(range).toLowerCase() : "the tune"}`}
              </button>
              <button
                className="big-ctl"
                style={{ minHeight: 56, fontFamily: "var(--font-body)", fontSize: "0.9375rem" }}
                aria-pressed={metro.running}
                onClick={() => (metro.running ? metro.stop() : metro.start(speed, tune.beats))}
              >
                {metro.running ? "Stop click" : "Click"}
              </button>
            </div>
            {error && (
              <div className="err" role="alert">
                {error}
              </div>
            )}

            {learning && total > 0 && (
              <div className="stack gap-xs push pt-md">
                <span className="small num">
                  <b className="strong">{learnt.length}</b> of {total} bars learnt
                </span>
                <BarStrip total={total} learnt={learnt} sel={range} />
                <button className="btn btn-secondary btn-block btn-lg mt-xs" disabled={!range} onClick={markLearnt}>
                  <span style={{ color: "var(--color-accent)" }}>
                    <CheckIcon size={18} />
                  </span>
                  {range ? `I’ve got ${rangeLabel(range).toLowerCase()}` : "Pick bars to mark them learnt"}
                </button>
                <button className="btn btn-quiet btn-block" onClick={() => setReady(true)}>
                  Ready already? Record a full take
                </button>
              </div>
            )}
          </>
        )}
        <div ref={hiddenRef} style={{ display: "none" }} aria-hidden="true" />
      </div>
    </div>
  );
}

function ReadyForTake({
  tune,
  total,
  onBack,
  onRecordingChange,
  onSaved,
}: {
  tune: Tune;
  total: number;
  onBack?: () => void;
  onRecordingChange: (v: boolean) => void;
  onSaved: (rec: { durationMs: number }) => void;
}) {
  const all = total > 0 && tune.learntBars.length >= total;
  return (
    <div className="stack center" style={{ alignItems: "center", flex: 1 }}>
      {total > 0 && (
        <div className="stack gap-xs" style={{ width: "100%", textAlign: "left" }}>
          <span className="small num" style={{ color: all ? "var(--color-good)" : undefined, fontWeight: 600 }}>
            {all ? `All ${total} bars learnt` : `${tune.learntBars.length} of ${total} bars learnt`}
          </span>
          <BarStrip total={total} learnt={tune.learntBars} />
        </div>
      )}
      <h2 className="display mt-xl" style={{ fontSize: "2rem" }}>
        Play it all the way through?
      </h2>
      <p className="lede mt-sm" style={{ maxWidth: 320 }}>
        Record one take of the whole tune. Mistakes are fine. It moves the tune into your rotation and becomes your starting point.
      </p>
      <div className="mt-xl" style={{ width: "100%" }}>
        <Recorder mode="saved" tune={tune} big onRecordingChange={onRecordingChange} onSaved={onSaved} />
      </div>
      <div className="small mt-sm">Tap to start · {tune.tempo} BPM</div>
      {onBack && (
        <button className="btn btn-quiet push" onClick={onBack}>
          Not yet, keep practising
        </button>
      )}
    </div>
  );
}

function Graduated({ tune, take, onClose }: { tune: Tune; take: { durationMs: number; tempo: number }; onClose: () => void }) {
  const nav = useNav();
  return (
    <div className="stand" role="dialog" aria-modal="true" aria-label="You learnt it">
      <div className="stand-body center" style={{ paddingTop: 72 }}>
        <div className="asterism" aria-hidden="true">
          * * *
        </div>
        <h1 className="display mt-sm" style={{ fontSize: "2.25rem" }}>
          You learnt it
        </h1>
        <p className="lede mt-sm">
          {tune.title} is in your rotation. It comes up tomorrow at {take.tempo} BPM and climbs from there.
        </p>
        <div className="rec mt-xl" style={{ textAlign: "left" }}>
          <div className="hrow between">
            <span style={{ fontWeight: 600 }}>First take</span>
            <span className="small num">
              {take.tempo} BPM · {fmtDuration(take.durationMs)}
            </span>
          </div>
          <p className="small">Saved with the tune. Play it back any time from the tune’s page.</p>
        </div>
        <div className="stack gap-sm push pt-lg">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => nav.goTab("today")}>
            Back to Today
          </button>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => {
              onClose();
              nav.goTab("tunes", "find");
            }}
          >
            Pick the next tune to learn
          </button>
        </div>
      </div>
    </div>
  );
}
