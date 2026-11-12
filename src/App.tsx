import { useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AuthScreen } from "./auth/AuthScreen";
import { isSupabaseConfigured } from "./lib/supabase";
import { SetupScreen } from "./SetupScreen";
import { useTunes } from "./hooks/useTunes";
import { Practice } from "./pages/Practice";
import { Repertoire } from "./pages/Repertoire";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import { copy } from "./copy";

const TABS = ["practice", "repertoire", "library", "settings"] as const;
type TabName = (typeof TABS)[number];

export function App() {
  const { loading, session } = useAuth();

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }
  if (loading) {
    return <div className="center-note">{copy.app.loading}</div>;
  }
  if (!session) {
    return <AuthScreen />;
  }
  return <AppShell />;
}

function AppShell() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<TabName>("practice");
  const tunes = useTunes();
  const count = tunes.data?.length ?? 0;

  return (
    <>
      <header>
        <h1>{copy.app.title}</h1>
        <span className="sub">{copy.app.tuneCount(count)}</span>
        <span className="spacer" />
        <button className="signout" onClick={() => void signOut()}>
          {copy.app.signOut}
        </button>
      </header>
      <main>
        {tab === "practice" && <Practice />}
        {tab === "repertoire" && <Repertoire />}
        {tab === "library" && <Library />}
        {tab === "settings" && <Settings />}
      </main>
      <nav>
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {copy.app.tabs[t]}
          </button>
        ))}
      </nav>
    </>
  );
}
