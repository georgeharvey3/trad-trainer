/**
 * Every string the app shows a user, grouped by screen. Screens not yet
 * moved here still hold their own literals.
 */
export const copy = {
  app: {
    loading: "Loading…",
    tuneCount: (n: number) => (n ? `${n} tunes` : ""),
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
    count: (shown: number, total: number) => `${shown} of ${total} tunes`,
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
    count: (shown: number, total: number) => `${shown} of ${total} tunes`,
    add: "Add",
    inRepertoire: "In Repertoire",
    empty: "No tunes in the Library yet.",
    addFailed: "Could not add tune.",
  },
  pager: {
    prev: "‹ Prev",
    next: "Next ›",
    status: (page: number, count: number) => `Page ${page} of ${count}`,
  },
};
