import { useCallback, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AuthScreen } from "./auth/AuthScreen";
import { isSupabaseConfigured } from "./lib/supabase";
import { SetupScreen } from "./SetupScreen";
import { Today } from "./pages/Today";
import { Tunes } from "./pages/Tunes";
import { You } from "./pages/You";
import { TunePage } from "./pages/TunePage";
import { Learning } from "./pages/Learning";
import { Practice } from "./practice/Practice";
import { TuneEditor } from "./components/TuneEditor";
import { NavContext, type Nav, type PracticeOptions, type TabName, type TunesView } from "./nav";
import { copy } from "./copy";

export function App() {
  const { loading, session } = useAuth();

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loading) return <div className="center-note">{copy.app.loading}</div>;
  if (!session) return <AuthScreen />;
  return <AppShell />;
}

const TABS: TabName[] = ["today", "tunes", "you"];

type Overlay =
  | { kind: "practice"; opts: PracticeOptions }
  | { kind: "tune"; id: string }
  | { kind: "learning"; id: string };

function AppShell() {
  const [tab, setTab] = useState<TabName>("today");
  const [tunesView, setTunesView] = useState<TunesView>("mine");
  // A stack, so closing a view returns to the one under it (tune page → learning → back).
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [editor, setEditor] = useState<{ id: string | null; title?: string } | null>(null);

  const push = useCallback((o: Overlay) => setOverlays((s) => [...s, o]), []);
  const pop = useCallback(() => setOverlays((s) => s.slice(0, -1)), []);

  const nav: Nav = useMemo(
    () => ({
      tab,
      tunesView,
      setTunesView,
      goTab: (t, view) => {
        setOverlays([]);
        setTab(t);
        if (view) setTunesView(view);
      },
      startPractice: (opts = {}) => push({ kind: "practice", opts }),
      openTune: (id) => push({ kind: "tune", id }),
      openLearning: (id) => push({ kind: "learning", id }),
      editTune: (id, title) => setEditor({ id, title }),
    }),
    [tab, tunesView, push],
  );

  const top = overlays[overlays.length - 1];

  return (
    <NavContext.Provider value={nav}>
      <main aria-hidden={top ? true : undefined}>
        <div className="page">
          {tab === "today" && <Today />}
          {tab === "tunes" && <Tunes />}
          {tab === "you" && <You />}
        </div>
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t}
            className="tab"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => nav.goTab(t)}
          >
            {copy.app.tabs[t]}
          </button>
        ))}
      </nav>

      {top?.kind === "practice" && <Practice key={overlays.length} opts={top.opts} onClose={pop} />}
      {top?.kind === "tune" && <TunePage key={top.id} tuneId={top.id} onClose={pop} />}
      {top?.kind === "learning" && <Learning key={top.id} tuneId={top.id} onClose={pop} />}
      {editor && (
        <TuneEditor
          tuneId={editor.id}
          initialTitle={editor.title}
          onClose={() => setEditor(null)}
          onDeleted={() => {
            setEditor(null);
            setOverlays([]);
          }}
        />
      )}
    </NavContext.Provider>
  );
}
