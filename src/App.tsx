import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AuthScreen } from "./auth/AuthScreen";
import { isSupabaseConfigured } from "./lib/supabase";
import { SetupScreen } from "./SetupScreen";
import { useSeedIfEmpty } from "./hooks/useTunes";
import { useTunes } from "./hooks/useTunes";
import { Practice } from "./pages/Practice";
import { Tunes } from "./pages/Tunes";
import { Settings } from "./pages/Settings";

type TabName = "practice" | "tunes" | "settings";

export function App() {
  const { loading, session } = useAuth();

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }
  if (loading) {
    return <div className="center-note">Loading&hellip;</div>;
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
  const seed = useSeedIfEmpty();
  // Synchronous guard: StrictMode fires this effect twice on mount against the
  // same stale mutation state, so an async `isIdle` check isn't enough to stop
  // a double seed. A ref flips before the first mutate and blocks the second.
  const seededRef = useRef(false);

  // On first login for a new account, populate the starter tune list.
  useEffect(() => {
    if (tunes.isSuccess && tunes.data.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seed.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunes.isSuccess, tunes.data?.length]);

  const count = tunes.data?.length ?? 0;

  return (
    <>
      <header>
        <h1>
          <span className="fiddle">&#127931;</span>Trad Trainer
        </h1>
        <span className="sub">{count ? `${count} tunes` : ""}</span>
        <span className="spacer" />
        <button className="signout" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <main>
        {tab === "practice" && <Practice />}
        {tab === "tunes" && <Tunes />}
        {tab === "settings" && <Settings />}
      </main>
      <nav>
        <button className={tab === "practice" ? "active" : ""} onClick={() => setTab("practice")}>
          <span className="ico">&#9654;</span>Practice
        </button>
        <button className={tab === "tunes" ? "active" : ""} onClick={() => setTab("tunes")}>
          <span className="ico">&#9835;</span>Tunes
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          <span className="ico">&#9881;</span>Settings
        </button>
      </nav>
    </>
  );
}
