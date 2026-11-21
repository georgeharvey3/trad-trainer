/**
 * App navigation: three tabs plus full-screen views on top of them (practice,
 * a tune's page, learning, the tune editor). Plain state, no router: the app
 * is installed to a home screen and has no URLs worth sharing.
 */
import { createContext, useContext } from "react";

export type TabName = "today" | "tunes" | "you";
export type TunesView = "mine" | "find";

export interface PracticeOptions {
  /** Play this one tune instead of today's queue. */
  tuneId?: string;
}

export interface Nav {
  tab: TabName;
  goTab: (tab: TabName, view?: TunesView) => void;
  tunesView: TunesView;
  setTunesView: (v: TunesView) => void;
  startPractice: (opts?: PracticeOptions) => void;
  openTune: (id: string) => void;
  openLearning: (id: string) => void;
  /** Open the tune editor: an existing tune, or a new one with an optional title. */
  editTune: (id: string | null, title?: string) => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav must be used inside the app shell");
  return nav;
}
