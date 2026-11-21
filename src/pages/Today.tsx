import { useMemo } from "react";
import { useReviews, useTunes } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { useSession } from "../hooks/useSession";
import { dueTunes, eligibleTunes, slotsLeft } from "../lib/session";
import { addDays, todayStr } from "../lib/dates";
import { dayCounts, streak, summarize, typeBreakdown, weekStrip } from "../lib/progress";
import { getBarCount } from "../lib/barCount";
import { useNav } from "../nav";
import { Ring } from "../components/ui";
import { ChevronIcon, PlayIcon, PlusIcon } from "../components/Icons";
import type { Session, Settings, Tune } from "../lib/types";

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function Today() {
  const tunesQ = useTunes();
  const settingsQ = useSettings();
  const reviewsQ = useReviews();
  const [session, setSession] = useSession();
  const nav = useNav();

  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);
  const settings = settingsQ.data;
  const days = useMemo(() => dayCounts(reviewsQ.data ?? []), [reviewsQ.data]);

  const header = (
    <header className="mast" style={{ margin: "0 calc(-1 * var(--space-md))" }}>
      <span className="wordmark">Trad Trainer</span>
      <span className="mast-aside">{formatToday()}</span>
    </header>
  );

  if (tunesQ.isLoading || settingsQ.isLoading || !settings) {
    return (
      <>
        {header}
        <TodaySkeleton />
      </>
    );
  }
  if (tunesQ.isError) {
    return (
      <>
        {header}
        <div className="banner error mt-lg" role="alert">
          Couldn’t load your tunes. Check your connection and try again.
        </div>
      </>
    );
  }

  if (tunes.length === 0) {
    return (
      <>
        {header}
        <Welcome />
      </>
    );
  }

  const learning = tunes.filter((t) => t.stage === "learning");
  const due = dueTunes(tunes, session);
  const eligible = eligibleTunes(tunes, session, settings);
  const capped = eligible.length === 0 && due.length > 0;
  const week = weekStrip(days);
  const run = streak(days);

  return (
    <>
      {header}
      <div className="stack gap-lg pt-md pb-md">
        <section aria-label="This week">
          <div className="hrow between" style={{ marginBottom: 10 }}>
            <span className="eyebrow">This week</span>
            {run > 1 && <span className="small" style={{ color: "var(--color-accent)", fontWeight: 600 }}>{run} days in a row</span>}
          </div>
          <ol className="week" aria-label={`Practised on ${week.filter((d) => d.played).length} days this week`} style={{ listStyle: "none" }}>
            {week.map((d) => (
              <li key={d.date} className="wd">
                <i className={`${d.played ? "yes" : ""}${d.isToday ? " today" : ""}${d.isFuture ? " future" : ""}`} />
                <span className={`eyebrow${d.isToday ? " ink" : ""}`}>{d.label}</span>
              </li>
            ))}
          </ol>
        </section>

        {eligible.length > 0 ? (
          <SetCard eligible={eligible} session={session} settings={settings} onStart={() => nav.startPractice()} />
        ) : capped ? (
          <LimitReached
            waiting={due.length}
            settings={settings}
            onOneMore={() => {
              const s = { ...session, extra: (session.extra || 0) + 1 };
              setSession(s);
              nav.startPractice();
            }}
          />
        ) : session.results.length > 0 ? (
          <DayDone session={session} tunes={tunes} />
        ) : (
          <NothingDue tunes={tunes} hasLearning={learning.length > 0} />
        )}

        <LearningShelf learning={learning} emphasise={eligible.length === 0 && !capped} />
      </div>
    </>
  );
}

function SetCard({ eligible, session, settings, onStart }: { eligible: Tune[]; session: Session; settings: Settings; onStart: () => void }) {
  const done = session.done.length;
  // The set is what you'll play today: what's left of the limit, from the queue.
  const left = Math.min(eligible.length, slotsLeft(session, settings));
  const set = eligible.slice(0, left);
  const total = done + left;
  return (
    <section className="set-card" aria-label="Today’s set">
      <div className="hrow between">
        <span className="eyebrow accent">{done ? "Still to play" : "Today’s set"}</span>
        <span className="small num">Limit {settings.dailyCap}</span>
      </div>
      <div>
        <h1 className="display" style={{ fontSize: "2.75rem" }}>
          {left} {left === 1 ? "tune" : "tunes"}
        </h1>
        <div className="small mt-xs">{typeBreakdown(set)} · shuffled</div>
      </div>
      {done > 0 && (
        <div>
          <div className="pips" aria-hidden="true">
            {session.results.map((r) => (
              <div key={r.tuneId} className={`pip ${r.grade}`} />
            ))}
            {Array.from({ length: Math.max(0, total - session.results.length) }, (_, i) => (
              <div key={`q${i}`} className="pip queued" />
            ))}
          </div>
          <div className="small num mt-xs">
            {done} of {total} played
          </div>
        </div>
      )}
      <button className="btn btn-primary btn-block btn-lg" onClick={onStart}>
        <PlayIcon />
        {done ? "Continue practice" : "Start practice"}
      </button>
    </section>
  );
}

function LimitReached({ waiting, settings, onOneMore }: { waiting: number; settings: Settings; onOneMore: () => void }) {
  const nav = useNav();
  return (
    <section className="stack gap-sm center pt-md" aria-label="Daily limit reached">
      <div className="asterism" aria-hidden="true">* * *</div>
      <h1 className="display">That’s {settings.dailyCap} for today</h1>
      <p className="lede">
        You’ve hit your daily limit. {waiting} more {waiting === 1 ? "tune moves" : "tunes move"} to tomorrow.
      </p>
      <button className="btn btn-secondary btn-block mt-md" onClick={onOneMore}>
        Play one more anyway
      </button>
      <p className="small">A bonus tune. Your limit stays at {settings.dailyCap}.</p>
      <p className="small mt-sm">
        Often hitting the limit?{" "}
        <button className="link" onClick={() => nav.goTab("you")}>
          Raise it
        </button>
      </p>
    </section>
  );
}

function DayDone({ session, tunes }: { session: Session; tunes: Tune[] }) {
  const s = summarize(session.results);
  const tomorrow = addDays(todayStr(), 1);
  const dueTomorrow = tunes.filter((t) => t.stage !== "learning" && t.due <= tomorrow).length;
  return (
    <section className="stack gap-sm center pt-sm" aria-label="All caught up">
      <div className="asterism" aria-hidden="true">* * *</div>
      <h1 className="display">All caught up</h1>
      <p className="lede">
        You played {s.count} {s.count === 1 ? "tune" : "tunes"} today
        {s.totalGain > 0 ? `, +${s.totalGain} BPM in all` : ""}.
        <br />
        {dueTomorrow ? `${dueTomorrow} ${dueTomorrow === 1 ? "is" : "are"} due tomorrow.` : "Nothing due tomorrow."}
      </p>
      <div className="pips mt-sm" aria-hidden="true">
        {session.results.map((r) => (
          <div key={r.tuneId} className={`pip ${r.grade}`} />
        ))}
      </div>
    </section>
  );
}

function NothingDue({ tunes, hasLearning }: { tunes: Tune[]; hasLearning: boolean }) {
  const tomorrow = addDays(todayStr(), 1);
  const n = tunes.filter((t) => t.stage !== "learning" && t.due <= tomorrow).length;
  return (
    <section className="stack gap-2xs" aria-label="Review">
      <span className="eyebrow">Review</span>
      <h1 className="h2">Nothing due today</h1>
      <p className="small">
        {n ? `${n} ${n === 1 ? "tune comes" : "tunes come"} back tomorrow.` : "Nothing comes back tomorrow either."}
        {hasLearning ? "" : " A good day to start a new tune."}
      </p>
    </section>
  );
}

function LearningShelf({ learning, emphasise }: { learning: Tune[]; emphasise: boolean }) {
  const nav = useNav();
  if (learning.length === 0) {
    return (
      <button className="shelf" onClick={() => nav.goTab("tunes", "find")}>
        <span style={{ color: "var(--color-accent)" }}>
          <PlusIcon size={22} />
        </span>
        <span className="grow">
          <span style={{ fontWeight: 600, display: "block" }}>Start a new tune</span>
          <span className="small">Pick from the 200 most popular on The Session</span>
        </span>
        <span style={{ color: "var(--color-muted)" }}>
          <ChevronIcon />
        </span>
      </button>
    );
  }

  if (emphasise) {
    const t = learning[0];
    const total = getBarCount(t.id);
    return (
      <section className="set-card" aria-label="Learning">
        <span className="eyebrow accent">A good day to learn</span>
        <div className="hrow gap-md">
          {total ? <Ring done={t.learntBars.length} total={total} /> : null}
          <div className="grow">
            <div className="h2">{t.title}</div>
            <div className="small">
              {t.type}
              {total ? ` · ${t.learntBars.length} of ${total} bars learnt` : ""} · {t.tempo} BPM
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-block btn-lg" onClick={() => nav.openLearning(t.id)}>
          Keep learning
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Learning">
      <div className="sect" style={{ paddingTop: 0 }}>
        <span className="eyebrow">Learning</span>
        {learning.length > 2 && (
          <button className="link small" onClick={() => nav.goTab("tunes", "mine")}>
            See all {learning.length}
          </button>
        )}
      </div>
      <div className="stack gap-xs mt-sm">
        {learning.slice(0, 2).map((t) => {
          const total = getBarCount(t.id);
          return (
            <div key={t.id} className="shelf">
              {total ? <Ring done={t.learntBars.length} total={total} /> : null}
              <div className="grow">
                <div className="row-title">{t.title}</div>
                <div className="row-sub">{total ? `${t.learntBars.length} of ${total} bars learnt` : t.type}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => nav.openLearning(t.id)}>
                Continue
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Welcome() {
  const nav = useNav();
  const steps = [
    ["Add tunes", "From the Library — the 200 most popular tunes on The Session — or your own."],
    ["Play, then grade it", "Again, Hard, Good or Easy. That decides when it comes back."],
    ["Speed up over time", "The metronome creeps toward your target tempo as tunes get easier."],
  ];
  return (
    <div className="stack pt-lg" style={{ minHeight: "calc(100vh - 200px)" }}>
      <span className="eyebrow accent">Welcome</span>
      <h1 className="display mt-xs">Start your repertoire</h1>
      <p className="lede mt-xs">Add the tunes you play or want to learn. Practice then picks what to play each day.</p>
      <ol className="stack mt-lg" style={{ listStyle: "none" }}>
        {steps.map(([title, body], i) => (
          <li key={title} className="row" style={{ alignItems: "flex-start", gap: 14 }}>
            <span className="mono" style={{ fontWeight: 600, color: "var(--color-accent)", width: 18 }}>
              {i + 1}
            </span>
            <div className="row-main">
              <div style={{ fontWeight: 600 }}>{title}</div>
              <div className="row-sub">{body}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="stack gap-sm push pt-lg">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => nav.goTab("tunes", "find")}>
          Browse the Library
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => nav.editTune(null)}>
          Add my own tune
        </button>
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="stack gap-md pt-md" aria-busy="true" aria-label="Loading">
      <div className="sk" style={{ width: 80, height: 11 }} />
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="wd">
            <i style={{ borderColor: "var(--color-paper-3)" }} />
          </div>
        ))}
      </div>
      <div className="sk" style={{ height: 210, borderRadius: 14 }} />
      <div className="sk" style={{ height: 80, borderRadius: 12 }} />
    </div>
  );
}
