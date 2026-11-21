import { useMemo } from "react";
import { useLibraryTune, useReviews, useTunes } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { dueLabel, tempoSeries, type TempoPoint } from "../lib/progress";
import { targetTempo } from "../lib/srs";
import { formatKey } from "../lib/library";
import { getBarCount } from "../lib/barCount";
import { useNav } from "../nav";
import { AbcPlayer } from "../components/AbcPlayer";
import { ReferencePlayer } from "../components/ReferencePlayer";
import { Recorder } from "../components/Recorder";
import { Ring } from "../components/ui";
import { BackIcon, LoopIcon, PlayIcon } from "../components/Icons";

function shortDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** A tune's home: tempo over time, schedule, take, video and sheet music. */
export function TunePage({ tuneId, onClose }: { tuneId: string; onClose: () => void }) {
  const tunesQ = useTunes();
  const reviewsQ = useReviews();
  const settingsQ = useSettings();
  const nav = useNav();
  const tune = (tunesQ.data ?? []).find((t) => t.id === tuneId);
  const libQ = useLibraryTune(tune?.libraryTuneId ?? null);
  const series = useMemo(() => tempoSeries(reviewsQ.data ?? [], tuneId), [reviewsQ.data, tuneId]);

  if (!tune) {
    return (
      <div className="stand" role="dialog" aria-modal="true" aria-label="Tune">
        <div className="stand-top">
          <button className="icon-btn ghost" aria-label="Back" onClick={onClose}>
            <BackIcon />
          </button>
        </div>
        <p className="center-note">{tunesQ.isLoading ? "Loading…" : "This tune isn’t in your tunes any more."}</p>
      </div>
    );
  }

  const target = targetTempo(settingsQ.data?.targets ?? {}, tune.type);
  const reviews = series.length ? series.length - 1 : 0;
  const gain = series.length ? tune.tempo - series[0].tempo : 0;
  const learning = tune.stage === "learning";
  const bars = getBarCount(tune.id);
  const due = dueLabel(tune.due);

  return (
    <div className="stand" role="dialog" aria-modal="true" aria-label={tune.title}>
      <div className="stand-top">
        <div className="side">
          <button className="icon-btn ghost" aria-label="Back" onClick={onClose}>
            <BackIcon />
          </button>
        </div>
        <span />
        <div className="side end">
          <button className="btn btn-text btn-sm" onClick={() => nav.editTune(tune.id)}>
            Edit
          </button>
        </div>
      </div>
      <div className="stand-body" style={{ gap: "var(--space-md)" }}>
        <div>
          <div className="eyebrow accent">
            {tune.type}
            {libQ.data && <> · {formatKey(libQ.data.key)} · from The Session</>}
          </div>
          <h1 className="display mt-xs" style={{ fontSize: "2.125rem" }}>
            {tune.title}
          </h1>
          <p className="small mt-xs">
            {learning ? (
              "On your learning shelf"
            ) : (
              <>
                {series.length ? `First reviewed ${shortDate(series[0].date)} · ` : ""}
                {due === "today" ? <b style={{ color: "var(--color-accent)" }}>due today</b> : `due ${due}`}
              </>
            )}
          </p>
        </div>

        {learning ? (
          <div className="set-card">
            <div className="hrow gap-md">
              {bars ? <Ring done={tune.learntBars.length} total={bars} /> : null}
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{bars ? `${tune.learntBars.length} of ${bars} bars learnt` : "Learning"}</div>
                <div className="small">Record a full take to move it into the daily review.</div>
              </div>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={() => nav.openLearning(tune.id)}>
              Keep learning
            </button>
          </div>
        ) : (
          <>
            <div className="panel">
              <div className="hrow between" style={{ alignItems: "baseline" }}>
                <span className="stat-big">
                  {tune.tempo} <span className="small strong" style={{ fontFamily: "var(--font-body)" }}>BPM</span>
                </span>
                {gain !== 0 && (
                  <span className="small num" style={{ color: gain > 0 ? "var(--color-accent)" : "var(--color-again)", fontWeight: 600 }}>
                    {gain > 0 ? "+" : ""}
                    {gain} since {shortDate(series[0].date)}
                  </span>
                )}
              </div>
              {series.length > 1 ? (
                <TempoChart series={series} target={target} />
              ) : (
                <p className="small mt-sm">The tempo line starts after the first review. Target {target}.</p>
              )}
            </div>
            <div className="stats3">
              <div>
                <div className="stat-mid">{reviews}</div>
                <div className="small">{reviews === 1 ? "review" : "reviews"}</div>
              </div>
              <div>
                <div className="stat-mid">{tune.lapses}</div>
                <div className="small">{tune.lapses === 1 ? "slip-up" : "slip-ups"}</div>
              </div>
              <div>
                <div className="stat-mid">{tune.recordingPath ? 1 : 0}</div>
                <div className="small">{tune.recordingPath ? "take" : "takes"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: tune.libraryTuneId ? "2fr 1fr" : "1fr", gap: 10 }}>
              <button className="btn btn-primary btn-lg" onClick={() => nav.startPractice({ tuneId: tune.id })}>
                <PlayIcon />
                Play it now
              </button>
              {tune.libraryTuneId && (
                <button className="btn btn-secondary btn-lg" onClick={() => nav.openLearning(tune.id)}>
                  <LoopIcon />
                  Loop bars
                </button>
              )}
            </div>
          </>
        )}

        <section aria-label="Your take">
          <div className="sect">
            <span className="eyebrow">Your take</span>
          </div>
          <div className="mt-sm">
            <Recorder mode="saved" tune={tune} />
          </div>
        </section>

        <section aria-label="Reference video">
          <div className="sect">
            <span className="eyebrow">Reference</span>
          </div>
          <div className="mt-sm">
            {tune.referenceUrl ? (
              <ReferencePlayer key={tune.referenceUrl} url={tune.referenceUrl} onPlay={() => {}} />
            ) : (
              <div className="panel dashed stack gap-xs" style={{ alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600 }}>No reference video yet</div>
                <p className="small">Paste a YouTube link to a player you like. You can slow it to half speed without changing the pitch.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => nav.editTune(tune.id)}>
                  Add a video link
                </button>
              </div>
            )}
          </div>
        </section>

        {tune.libraryTuneId && (
          <section aria-label="Sheet music">
            <div className="sect">
              <span className="eyebrow">Sheet music</span>
              <span className="small">First setting on The Session</span>
            </div>
            <div className="mt-sm">
              <AbcPlayer libraryTuneId={tune.libraryTuneId} type={tune.type} beats={tune.beats} tempo={tune.tempo} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Tempo over time against the target line. */
function TempoChart({ series, target }: { series: TempoPoint[]; target: number }) {
  const W = 320;
  const H = 96;
  const lo = Math.min(...series.map((p) => p.tempo)) - 4;
  const hi = Math.max(target, ...series.map((p) => p.tempo));
  const y = (v: number) => 14 + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - 22);
  const x = (i: number) => 4 + (i * (W - 8)) / Math.max(1, series.length - 1);
  const pts = series.map((p, i) => `${x(i)},${y(p.tempo)}`).join(" ");
  const last = series[series.length - 1];
  return (
    <svg
      className="chart mt-sm"
      viewBox={`0 0 ${W} ${H + 14}`}
      role="img"
      aria-label={`Tempo went from ${series[0].tempo} to ${last.tempo} BPM over ${series.length - 1} reviews. Target ${target}.`}
    >
      <line x1="0" y1={y(target)} x2={W} y2={y(target)} stroke="var(--color-good-border)" strokeDasharray="4 4" />
      <text x={W} y={y(target) - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)" fontFamily="IBM Plex Sans, sans-serif">
        target {target}
      </text>
      <line x1="0" y1={H} x2={W} y2={H} stroke="var(--color-rule)" />
      <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(series.length - 1)} cy={y(last.tempo)} r="4" fill="var(--color-accent)" />
      <text x="4" y={H + 12} fontSize="10" fill="var(--color-muted)" fontFamily="IBM Plex Sans, sans-serif">
        {shortDate(series[0].date)}
      </text>
      <text x={W} y={H + 12} textAnchor="end" fontSize="10" fill="var(--color-muted)" fontFamily="IBM Plex Sans, sans-serif">
        {shortDate(last.date)}
      </text>
    </svg>
  );
}
