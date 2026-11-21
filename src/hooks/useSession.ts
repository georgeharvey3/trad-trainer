import { useCallback, useEffect, useState } from "react";
import { loadSession, saveSession } from "../lib/session";
import type { Session } from "../lib/types";

const EVENT = "tradTrainer:session";

/**
 * Today's practice session (per device). Every screen that uses it sees the
 * same value: a change in practice updates Today underneath it. A new day
 * starts a fresh session when the app comes back to the front.
 */
export function useSession(): [Session, (s: Session) => void] {
  const [session, setState] = useState<Session>(() => loadSession());

  useEffect(() => {
    const sync = () => setState(loadSession());
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener(EVENT, sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(EVENT, sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const set = useCallback((s: Session) => {
    saveSession(s);
    setState(s);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [session, set];
}
