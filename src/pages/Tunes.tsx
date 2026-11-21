import { useMemo, useState } from "react";
import { libraryTuneInput, useAddTune, useLibrary, useReviews, useTunes } from "../hooks/useTunes";
import { useSettings } from "../hooks/useSettings";
import { formatKey, libraryView } from "../lib/library";
import { dueLabel, starterSet, tempoSeries } from "../lib/progress";
import { getBarCount } from "../lib/barCount";
import { targetTempo } from "../lib/srs";
import { PAGE_SIZE } from "../lib/paging";
import { isDuplicate, writeErrorText } from "../lib/dbErrors";
import { TUNE_TYPES, type LibraryTune, type Review, type Stage, type Tune } from "../lib/types";
import { useNav } from "../nav";
import { AbcPlayer } from "../components/AbcPlayer";
import { Ring, Sheet } from "../components/ui";
import { BookIcon, CheckIcon, ChevronIcon, CloseIcon, PlayIcon, PlusIcon, SearchIcon, StopIcon } from "../components/Icons";

export function Tunes() {
  const nav = useNav();
  const tunesQ = useTunes();
  const count = tunesQ.data?.length ?? 0;
  return (
    <>
      <header className="mast" style={{ margin: "0 calc(-1 * var(--space-md))" }}>
        <span className="mast-title">Tunes</span>
        <button className="icon-btn" aria-label="Add your own tune" onClick={() => nav.editTune(null)}>
          <PlusIcon />
        </button>
      </header>
      <div className="pt-md">
        <div className="seg" role="tablist" aria-label="Which tunes">
          <button role="tab" aria-selected={nav.tunesView === "mine"} onClick={() => nav.setTunesView("mine")}>
            Mine{count ? ` · ${count}` : ""}
          </button>
          <button role="tab" aria-selected={nav.tunesView === "find"} onClick={() => nav.setTunesView("find")}>
            Find
          </button>
        </div>
      </div>
      {nav.tunesView === "mine" ? <Mine /> : <Find />}
    </>
  );
}

// ---------------------------------------------------------------- Mine

type Sort = "due" | "title" | "behind";
const SORT_LABEL: Record<Sort, string> = { due: "Next due", title: "A–Z", behind: "Furthest from target" };

function Mine() {
  const nav = useNav();
  const tunesQ = useTunes();
  const reviewsQ = useReviews();
  const settingsQ = useSettings();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("due");

  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);
  const targets = settingsQ.data?.targets ?? {};
  const q = search.trim().toLowerCase();
  const match = (t: Tune) => !q || t.title.toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
  const learning = tunes.filter((t) => t.stage === "learning" && match(t));
  const rotation = tunes
    .filter((t) => t.stage !== "learning" && match(t))
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "behind"
          ? a.tempo / targetTempo(targets, a.type) - b.tempo / targetTempo(targets, b.type)
          : a.due.localeCompare(b.due) || a.title.localeCompare(b.title),
    );

  if (tunesQ.isLoading) return <RowsSkeleton />;
  if (tunesQ.isError) return <div className="banner error mt-lg">Couldn’t load your tunes. Check your connection and try again.</div>;

  if (tunes.length === 0) {
    return (
      <div className="stack center gap-sm" style={{ paddingTop: 80, alignItems: "center" }}>
        <div className="asterism" aria-hidden="true">* * *</div>
        <h2 className="h2 mt-sm">No tunes yet</h2>
        <p className="small" style={{ maxWidth: 280 }}>
          Your tunes are the ones you’re keeping in your fingers. Start with a few you already know.
        </p>
        <div className="stack gap-sm mt-md" style={{ width: "100%" }}>
          <button className="btn btn-primary btn-block" onClick={() => nav.setTunesView("find")}>
            Browse the Library
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => nav.editTune(null)}>
            Add my own tune
          </button>
        </div>
      </div>
    );
  }

  const reviews = reviewsQ.data ?? [];

  return (
    <div className="pb-md">
      <SearchBox value={search} onChange={setSearch} placeholder="Search your tunes" />

      {q && learning.length === 0 && rotation.length === 0 ? (
        <div className="stack center gap-xs" style={{ paddingTop: 48, alignItems: "center" }}>
          <h2 className="h2">No “{search.trim()}” here yet</h2>
          <p className="small" style={{ maxWidth: 280 }}>
            None of your {tunes.length} tunes match. It might be in the Library.
          </p>
          <div className="stack gap-sm mt-md" style={{ width: "100%" }}>
            <button className="btn btn-primary btn-block" onClick={() => nav.setTunesView("find")}>
              Search the Library
            </button>
            <button className="btn btn-secondary btn-block" onClick={() => nav.editTune(null, search.trim())}>
              Add “{search.trim()}” as my own tune
            </button>
          </div>
        </div>
      ) : (
        <>
          {learning.length > 0 && (
            <section aria-label="Learning">
              <div className="sect">
                <span className="eyebrow accent">Learning</span>
                <span className="small num">{learning.length}</span>
              </div>
              {learning.map((t) => {
                const total = getBarCount(t.id);
                return (
                  <button key={t.id} className="row" onClick={() => nav.openLearning(t.id)}>
                    {total ? <Ring small done={t.learntBars.length} total={total} /> : <Ring small done={0} total={1} />}
                    <span className="row-main">
                      <span className="row-title" style={{ display: "block" }}>
                        {t.title}
                      </span>
                      <span className="row-sub" style={{ display: "block" }}>
                        {t.type} · {total ? `${t.learntBars.length} of ${total} bars learnt` : "just started"}
                      </span>
                    </span>
                    <span style={{ color: "var(--color-muted)" }}>
                      <ChevronIcon />
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          <section aria-label="In rotation">
            <div className="sect">
              <span className="eyebrow">In rotation · {rotation.length}</span>
              <label className="small hrow gap-2xs">
                <span className="visually-hidden">Sort by</span>
                <select
                  className="btn-quiet"
                  style={{ border: 0, background: "none", font: "inherit", minHeight: 24, color: "var(--color-muted)" }}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                >
                  {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {rotation.map((t) => (
              <button key={t.id} className="row" onClick={() => nav.openTune(t.id)}>
                <span className="row-main">
                  <span className="row-title" style={{ display: "block" }}>
                    {t.title}
                  </span>
                  <span className="row-sub" style={{ display: "block" }}>
                    {t.type} ·{" "}
                    {dueLabel(t.due) === "today" ? <span className="due-now">due today</span> : `due ${dueLabel(t.due)}`}
                  </span>
                </span>
                <Sparkline reviews={reviews} tune={t} />
                <span className="tm-fig">{t.tempo}</span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

/** A tune's last few tempos as a small line. Rust when the last review went down. */
function Sparkline({ reviews, tune }: { reviews: Review[]; tune: Tune }) {
  const pts = tempoSeries(reviews, tune.id).slice(-8);
  if (pts.length < 2) return <span style={{ width: 64 }} aria-hidden="true" />;
  const min = Math.min(...pts.map((p) => p.tempo));
  const max = Math.max(...pts.map((p) => p.tempo));
  const span = Math.max(1, max - min);
  const d = pts.map((p, i) => `${2 + (i * 60) / (pts.length - 1)},${22 - ((p.tempo - min) / span) * 18}`).join(" ");
  const down = pts[pts.length - 1].tempo < pts[pts.length - 2].tempo;
  return (
    <svg width="64" height="26" viewBox="0 0 64 26" aria-hidden="true" style={{ flex: "none" }}>
      <polyline
        points={d}
        fill="none"
        stroke={down ? "var(--color-again-border)" : "var(--color-accent)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------- Find

function Find() {
  const libraryQ = useLibrary();
  const tunesQ = useTunes();
  const nav = useNav();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [key, setKey] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [starter, setStarter] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [adding, setAdding] = useState<LibraryTune | null>(null);

  const library = useMemo(() => libraryQ.data ?? [], [libraryQ.data]);
  const mine = useMemo(() => {
    const m = new Map<string, Tune>();
    for (const t of tunesQ.data ?? []) if (t.libraryTuneId) m.set(t.libraryTuneId, t);
    return m;
  }, [tunesQ.data]);
  const rank = useMemo(() => {
    const r = new Map<string, number>();
    libraryView(library, { search: "", sort: "popularity", reverse: false, type: "", key: "" }).forEach((t, i) => r.set(t.id, i + 1));
    return r;
  }, [library]);
  const keys = useMemo(
    () => [...new Set(library.filter((t) => !type || t.type === type).map((t) => t.key))].sort(),
    [library, type],
  );
  const starters = useMemo(() => starterSet(library), [library]);
  const list = useMemo(
    () => (starter ? starters : libraryView(library, { search, sort: "popularity", reverse: false, type, key })),
    [starter, starters, library, search, type, key],
  );
  const typesInLibrary = TUNE_TYPES.filter((t) => library.some((l) => l.type === t));

  if (libraryQ.isError) {
    return (
      <div className="stack center gap-xs" style={{ paddingTop: 72, alignItems: "center" }}>
        <h2 className="h2">Couldn’t load the Library</h2>
        <p className="small">Check your connection and try again. Your tunes are safe.</p>
        <button className="btn btn-primary mt-md" style={{ minWidth: 160 }} onClick={() => void libraryQ.refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (libraryQ.isLoading) return <RowsSkeleton />;
  if (library.length === 0) return <p className="center-note">No tunes in the Library yet.</p>;

  const filtersOn = !!(type || key || search.trim());
  const reset = () => setShown(PAGE_SIZE);

  return (
    <div className="pb-md">
      <SearchBox
        value={search}
        onChange={(v) => {
          setSearch(v);
          setStarter(false);
          reset();
        }}
        placeholder={`Search ${library.length} tunes from The Session`}
      />

      {(tunesQ.data?.length ?? 0) < 10 && !filtersOn && !starter && starters.length === 5 && (
        <div className="set-card mt-md" style={{ padding: "14px 16px", gap: 8, background: "var(--color-paper-2)", borderWidth: 1, borderColor: "var(--color-rule-2)" }}>
          <span className="eyebrow accent">Starter set</span>
          <div style={{ fontWeight: 600 }}>Five tunes you’ll hear at any session</div>
          <div className="small">2 reels, 2 jigs and a polka, in D or G where there’s one.</div>
          <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setStarter(true)}>
            See the five
          </button>
        </div>
      )}

      {starter ? (
        <div className="hrow between mt-md">
          <span className="eyebrow accent">Starter set</span>
          <button className="chip" onClick={() => setStarter(false)}>
            <CloseIcon size={14} />
            Back to all
          </button>
        </div>
      ) : (
        <>
          <div className="chips mt-md" role="group" aria-label="Tune type">
            <button className="chip" aria-pressed={!type} onClick={() => { setType(""); setKey(""); reset(); }}>
              All
            </button>
            {typesInLibrary.map((t) => (
              <button key={t} className="chip" aria-pressed={type === t} onClick={() => { setType(type === t ? "" : t); setKey(""); reset(); }}>
                {t}
              </button>
            ))}
          </div>
          <div className="hrow between mt-xs">
            <span className="small num">
              {filtersOn ? `${list.length} of ${library.length}` : `${library.length} tunes · most popular first`}
            </span>
            <label className="hrow">
              <span className="visually-hidden">Key</span>
              <select
                className={`chip${key ? " on" : ""}`}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  reset();
                }}
              >
                <option value="">Any key</option>
                {keys.map((k) => (
                  <option key={k} value={k}>
                    {formatKey(k)} ({library.filter((t) => t.key === k && (!type || t.type === type)).length})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      {list.length === 0 ? (
        <div className="stack center gap-xs" style={{ paddingTop: 48, alignItems: "center" }}>
          <h2 className="h2">No tunes match</h2>
          <p className="small" style={{ maxWidth: 290 }}>
            The Library holds the 200 most popular tunes on The Session.
          </p>
          <div className="stack gap-sm mt-md" style={{ width: "100%" }}>
            {(type || key) && (
              <button className="btn btn-primary btn-block" onClick={() => { setType(""); setKey(""); }}>
                Clear the filters
              </button>
            )}
            <button className="btn btn-secondary btn-block" onClick={() => nav.editTune(null, search.trim())}>
              Add it as my own tune
            </button>
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--color-ink)", marginTop: 10 }}>
          {list.slice(0, shown).map((t) => {
            const own = mine.get(t.id);
            const open = previewId === t.id;
            return (
              <div key={t.id} style={open ? { background: "var(--color-paper-2)", margin: "0 calc(-1 * var(--space-md))", padding: "0 var(--space-md) var(--space-md)", borderBottom: "1px solid var(--color-rule)" } : undefined}>
                <div className="row" style={open ? { borderBottom: 0 } : undefined}>
                  <span className="row-rank">{rank.get(t.id)}</span>
                  <div className="row-main">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub">
                      {t.type} · {formatKey(t.key)}
                      {own?.stage === "learning" && <span className="due-now"> · learning</span>}
                    </div>
                  </div>
                  <button
                    className={`icon-btn${open ? " on" : ""}`}
                    aria-label={open ? `Close ${t.name}` : `Listen to ${t.name}`}
                    aria-expanded={open}
                    onClick={() => setPreviewId(open ? null : t.id)}
                  >
                    {open ? <StopIcon size={16} /> : <PlayIcon size={16} />}
                  </button>
                  {own ? (
                    <span className="in-rep" role="img" aria-label={own.stage === "learning" ? "On your learning shelf" : "In your tunes"}>
                      {own.stage === "learning" ? <BookIcon size={18} /> : <CheckIcon size={18} />}
                    </span>
                  ) : (
                    <button className="icon-btn solid" aria-label={`Add ${t.name}`} onClick={() => setAdding(t)}>
                      <PlusIcon />
                    </button>
                  )}
                </div>
                {open && (
                  <div className="stack gap-sm">
                    <div className="panel">
                      <AbcPlayer libraryTuneId={t.id} type={t.type} />
                    </div>
                    {!own && (
                      <button className="btn btn-primary btn-block" onClick={() => setAdding(t)}>
                        <PlusIcon size={16} />
                        Add to my tunes
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {list.length > shown && (
            <button className="btn btn-secondary btn-block mt-md" onClick={() => setShown(shown + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, list.length - shown)} more
            </button>
          )}
        </div>
      )}

      {adding && <AddSheet tune={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

/** "Know it, or learning it?" — where a Library tune goes when it's added. */
function AddSheet({ tune, onClose }: { tune: LibraryTune; onClose: () => void }) {
  const add = useAddTune();
  const nav = useNav();
  const [error, setError] = useState<string | null>(null);

  function choose(stage: Stage) {
    setError(null);
    add.mutate(libraryTuneInput(tune, stage), {
      onSuccess: (created) => {
        onClose();
        if (stage === "learning") nav.openLearning(created.id);
      },
      onError: (e) => {
        setError(
          isDuplicate(e)
            ? `You already have a ${tune.type.toLowerCase()} called “${tune.name}”.`
            : writeErrorText(e, "Couldn’t add the tune."),
        );
      },
    });
  }

  return (
    <Sheet label={`Add ${tune.name}`} onClose={onClose}>
      <span className="eyebrow">
        {tune.type} · {formatKey(tune.key)}
      </span>
      <div className="h2 mt-xs">{tune.name}</div>
      <p className="small mt-xs">How well do you know it?</p>
      <div className="stack gap-sm mt-md">
        <button className="gopt neutral" disabled={add.isPending} onClick={() => choose("rotation")}>
          <span style={{ color: "var(--color-accent)", flex: "none" }}>
            <CheckIcon size={24} />
          </span>
          <span className="grow">
            <b>I can play it</b>
            <span className="gopt-line">Add it to my daily rotation. It joins today’s practice.</span>
          </span>
        </button>
        <button className="gopt chosen" disabled={add.isPending} onClick={() => choose("learning")}>
          <span style={{ color: "var(--color-accent)", flex: "none" }}>
            <BookIcon />
          </span>
          <span className="grow">
            <b>I want to learn it</b>
            <span className="gopt-line">Put it on my learning shelf. Loop any bars of the score, slowed down.</span>
          </span>
        </button>
      </div>
      {error && (
        <div className="banner error mt-sm" role="alert">
          {error}
        </div>
      )}
      <button className="btn btn-quiet btn-block mt-xs" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- shared

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search mt-md">
      <SearchIcon />
      <input className="input" type="search" placeholder={placeholder} aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button className="icon-btn ghost clear" aria-label="Clear search" onClick={() => onChange("")}>
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mt-md">
      <div className="sk" style={{ height: 48, borderRadius: 7 }} />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="row">
          <div className="row-main stack gap-xs">
            <div className="sk" style={{ width: 120 + ((i * 37) % 70), height: 16 }} />
            <div className="sk" style={{ width: 90, height: 12 }} />
          </div>
          <div className="sk" style={{ width: 56, height: 14 }} />
        </div>
      ))}
    </div>
  );
}
