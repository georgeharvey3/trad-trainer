/**
 * Every string the app shows a user, grouped by screen. Screens not yet
 * moved here still hold their own literals.
 */
const listCount = (shown: number, total: number) => `${shown} of ${total} tunes`;

export const copy = {
  app: {
    title: "Trad Trainer",
    loading: "Loading…",
    tuneCount: (n: number) => (n === 0 ? "" : n === 1 ? "1 tune" : `${n} tunes`),
    signOut: "Sign out",
    tabs: {
      practice: "Practice",
      repertoire: "Repertoire",
      library: "Library",
      settings: "Settings",
    },
  },
  repertoire: {
    search: "Search tunes…",
    add: "+ Add",
    count: listCount,
    hasRecording: "Has recording",
    due: (days: number) => (days <= 0 ? "due now" : days === 1 ? "due tomorrow" : `due in ${days}d`),
  },
  library: {
    search: "Search Library…",
    sortPopularity: "Popularity",
    sortTitle: "Title",
    reverse: "Reverse",
    allTypes: "All types",
    allKeys: "All keys",
    count: listCount,
    add: "Add",
    inRepertoire: "In Repertoire",
    empty: "No tunes in the Library yet.",
    loadFailed: "Could not load the Library.",
    addFailed: "Could not add tune.",
    addDuplicate: (title: string) => `Your Repertoire already has “${title}”.`,
  },
  pager: {
    prev: "‹ Prev",
    next: "Next ›",
    status: (page: number, count: number) => `Page ${page} of ${count}`,
  },
};
