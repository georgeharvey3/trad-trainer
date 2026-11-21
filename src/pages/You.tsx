import { useEffect, useMemo, useRef, useState } from "react";
import { useReviews, useTunes } from "../hooks/useTunes";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useAuth } from "../auth/AuthProvider";
import { biggestGains, dayCounts, heatmap, streak } from "../lib/progress";
import { todayStr } from "../lib/dates";
import { TUNE_TYPES, type Settings, type Tune } from "../lib/types";
import { Stepper, Switch } from "../components/ui";
import { CheckIcon, DownIcon, DownloadIcon } from "../components/Icons";

/** Progress first, then the few settings there are. */
export function You() {
  const settingsQ = useSettings();
  return (
    <>
      <header className="mast" style={{ margin: "0 calc(-1 * var(--space-md))" }}>
        <span className="mast-title">You</span>
      </header>
      <Progress />
      {settingsQ.data ? <SettingsForm initial={settingsQ.data} /> : <div className="sk mt-lg" style={{ height: 240 }} />}
    </>
  );
}

function Progress() {
  const reviewsQ = useReviews();
  const tunesQ = useTunes();
  const reviews = useMemo(() => reviewsQ.data ?? [], [reviewsQ.data]);
  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);
  const days = useMemo(() => dayCounts(reviews), [reviews]);
  const cols = useMemo(() => heatmap(days), [days]);
  const gains = useMemo(() => biggestGains(reviews, tunes), [reviews, tunes]);
  const daysPlayed = cols.flat().filter((c) => c.count > 0).length;

  return (
    <div className="stack gap-lg pt-md">
      <div className="stats3">
        <div>
          <div className="stat-big" style={{ color: "var(--color-accent)" }}>
            {streak(days)}
          </div>
          <div className="small">day streak</div>
        </div>
        <div>
          <div className="stat-big">{tunes.filter((t: Tune) => t.stage !== "learning").length}</div>
          <div className="small">in rotation</div>
        </div>
        <div>
          <div className="stat-big">{tunes.filter((t: Tune) => t.stage === "learning").length}</div>
          <div className="small">learning</div>
        </div>
      </div>

      <section aria-label="Last 12 weeks">
        <div className="hrow between" style={{ marginBottom: 10 }}>
          <span className="eyebrow">Last 12 weeks</span>
          <span className="small num">{daysPlayed} of 84 days</span>
        </div>
        <div className="heat" role="img" aria-label={`Practised on ${daysPlayed} of the last 84 days`}>
          {cols.flat().map((c) => (
            <i
              key={c.date}
              title={`${c.date}: ${c.count} ${c.count === 1 ? "tune" : "tunes"}`}
              className={`${c.level ? `l${c.level}` : ""}${c.isToday ? " today" : ""}${c.isFuture ? " future" : ""}`}
            />
          ))}
        </div>
        <div className="heat-key mt-xs" aria-hidden="true">
          fewer
          <i style={{ background: "var(--color-paper-3)" }} />
          <i className="l1" style={{ background: "oklch(80% 0.06 155)" }} />
          <i className="l2" style={{ background: "oklch(62% 0.09 155)" }} />
          <i style={{ background: "var(--color-accent)" }} />
          more tunes
        </div>
      </section>

      <section aria-label="Biggest gains">
        <div className="sect" style={{ paddingTop: 0 }}>
          <span className="eyebrow">Biggest gains</span>
          <span className="small">since first review</span>
        </div>
        {gains.length ? (
          gains.map((g) => (
            <div key={g.tune.id} className="row compact">
              <div className="row-main">
                <div className="row-title" style={{ fontSize: "1rem" }}>
                  {g.tune.title}
                </div>
                <div className="row-sub num">
                  {g.from} → {g.to} BPM
                </div>
              </div>
              <span className="mono" style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                +{g.gain}
              </span>
            </div>
          ))
        ) : (
          <p className="small mt-sm">Grade a few tunes and your tempo gains show up here.</p>
        )}
      </section>
    </div>
  );
}

const COMMON_TYPES = ["Reel", "Jig", "Hornpipe", "Polka"];

function SettingsForm({ initial }: { initial: Settings }) {
  const { user, signOut } = useAuth();
  const update = useUpdateSettings();
  const tunesQ = useTunes();
  const [local, setLocal] = useState<Settings>(initial);
  const [allTypes, setAllTypes] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function commit(next: Settings, section: string) {
    setLocal(next);
    update.mutate(next, {
      onSuccess: () => {
        setSaved(section);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaved(null), 2000);
      },
    });
  }

  function exportBackup() {
    const payload = { exportedAt: new Date().toISOString(), settings: local, tunes: tunesQ.data ?? [] };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const name = `trad-trainer-backup-${todayStr()}.json`;
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    setExported(name);
  }

  const savedTick = (section: string) =>
    saved === section ? (
      <span className="hrow gap-2xs" role="status" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-good)" }}>
        <CheckIcon size={14} />
        Saved
      </span>
    ) : update.isError && saved === null ? (
      <span className="err" style={{ fontSize: 12 }}>
        Couldn’t save
      </span>
    ) : null;

  const types = allTypes ? TUNE_TYPES : TUNE_TYPES.filter((t) => COMMON_TYPES.includes(t));

  return (
    <div className="stack pt-lg pb-md">
      <section aria-label="Practice settings">
        <div className="sect">
          <span className="eyebrow">Practice</span>
          {savedTick("practice")}
        </div>
        <div className="row">
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>Daily limit</div>
            <div className="row-sub">Most tunes to review in a day. Opening a tune doesn’t count — only grading it.</div>
          </div>
          <Stepper label="Daily limit" value={local.dailyCap} min={1} max={200} onChange={(v) => commit({ ...local, dailyCap: v }, "practice")} />
        </div>
        <div className="row">
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>Count-in</div>
            <div className="row-sub">One bar of clicks before each tune</div>
          </div>
          <Switch label="Count-in" checked={local.countIn} onChange={(v) => commit({ ...local, countIn: v }, "practice")} />
        </div>
        <div className="row">
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>Keep screen on</div>
            <div className="row-sub">While practising or learning</div>
          </div>
          <Switch label="Keep screen on" checked={local.keepAwake} onChange={(v) => commit({ ...local, keepAwake: v }, "practice")} />
        </div>
      </section>

      <section aria-label="Target tempos" className="mt-md">
        <div className="sect">
          <span className="eyebrow">Target tempos · BPM</span>
          {savedTick("targets")}
        </div>
        {types.map((t) => (
          <div key={t} className="row compact">
            <span className="grow" style={{ fontWeight: 500 }}>
              {t}
            </span>
            <Stepper
              label={`${t} target`}
              value={local.targets[t] ?? 200}
              min={40}
              max={300}
              step={2}
              onChange={(v) => commit({ ...local, targets: { ...local.targets, [t]: v } }, "targets")}
            />
          </div>
        ))}
        <button className="row btn-text" style={{ justifyContent: "space-between", minHeight: 52, padding: 0, fontSize: "0.9375rem" }} onClick={() => setAllTypes(!allTypes)}>
          {allTypes ? "Show fewer" : `Show ${TUNE_TYPES.length - COMMON_TYPES.length} more types`}
          <span style={{ transform: allTypes ? "rotate(180deg)" : undefined, display: "inline-flex" }}>
            <DownIcon size={16} />
          </span>
        </button>
        <p className="small mt-sm">Each grade moves a tune’s tempo: Easy +4, Good +2, Hard 0, Again −8. It never goes past the target.</p>
      </section>

      <section aria-label="Account" className="mt-md">
        <div className="sect">
          <span className="eyebrow">Account</span>
        </div>
        <div className="row">
          <div className="row-main">
            <div className="row-sub" style={{ margin: 0 }}>
              Signed in as
            </div>
            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{user?.email}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <button className="row" onClick={exportBackup}>
          <span className="row-main">
            <span style={{ fontWeight: 600, display: "block" }}>Download a backup</span>
            <span className="row-sub" style={{ display: "block" }}>
              Tunes and settings as a JSON file. Takes stay in the cloud and aren’t included.
            </span>
          </span>
          <span style={{ color: "var(--color-muted)" }}>
            <DownloadIcon />
          </span>
        </button>
        {exported && (
          <div className="banner ok mt-sm" role="status">
            <CheckIcon />
            <span>
              Saved <span className="mono">{exported}</span>
            </span>
          </div>
        )}
        <p className="small center mt-lg">Tunes and sheet music from The Session</p>
      </section>
    </div>
  );
}
