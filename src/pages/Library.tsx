import { useMemo, useState } from "react";
import { libraryTuneInput, useAddTune, useLibrary, useTunes } from "../hooks/useTunes";
import { formatKey, libraryView, type LibrarySort } from "../lib/library";
import { TUNE_TYPES, type LibraryTune } from "../lib/types";
import { Pager } from "../components/Pager";
import { pageSlice } from "../lib/paging";
import { copy } from "../copy";

export function Library() {
  const libraryQ = useLibrary();
  const tunesQ = useTunes();
  const addTune = useAddTune();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LibrarySort>("popularity");
  const [reverse, setReverse] = useState(false);
  const [type, setType] = useState("");
  const [key, setKey] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<string | null>(null);

  const library = useMemo(() => libraryQ.data ?? [], [libraryQ.data]);
  // A tune is in the Repertoire only through `library_tune_id`, never by title.
  const inRepertoire = useMemo(
    () => new Set((tunesQ.data ?? []).map((t) => t.libraryTuneId).filter(Boolean)),
    [tunesQ.data],
  );
  const keys = useMemo(() => [...new Set(library.map((t) => t.key))].sort(), [library]);
  const list = useMemo(
    () => libraryView(library, { search, sort, reverse, type, key }),
    [library, search, sort, reverse, type, key],
  );
  const { items, currentPage, pageCount } = pageSlice(list, page);

  // Any filter change goes back to page 1.
  function filter<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }

  function add(t: LibraryTune) {
    setAdding(t.id);
    addTune.mutate(libraryTuneInput(t), { onSettled: () => setAdding(null) });
  }

  if (libraryQ.isSuccess && library.length === 0) {
    return <div className="center-note">{copy.library.empty}</div>;
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder={copy.library.search}
          value={search}
          onChange={(e) => filter(setSearch)(e.target.value)}
        />
      </div>
      <div className="toolbar library-filters">
        <select value={sort} onChange={(e) => filter(setSort)(e.target.value as LibrarySort)}>
          <option value="popularity">{copy.library.sortPopularity}</option>
          <option value="title">{copy.library.sortTitle}</option>
        </select>
        <button
          className={reverse ? "active" : ""}
          aria-pressed={reverse}
          onClick={() => filter(setReverse)(!reverse)}
        >
          {copy.library.reverse}
        </button>
        <select value={type} onChange={(e) => filter(setType)(e.target.value)}>
          <option value="">{copy.library.allTypes}</option>
          {TUNE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={key} onChange={(e) => filter(setKey)(e.target.value)}>
          <option value="">{copy.library.allKeys}</option>
          {keys.map((k) => (
            <option key={k} value={k}>
              {formatKey(k)}
            </option>
          ))}
        </select>
      </div>
      <div className="tune-count">{copy.library.count(list.length, library.length)}</div>
      {addTune.isError && <div className="error-note">{copy.library.addFailed}</div>}
      <div>
        {items.map((t) => (
          <div key={t.id} className="tune-row library-row">
            <div className="t-main">
              <div className="t-title">{t.name}</div>
              <div className="t-sub">
                {t.type} · {formatKey(t.key)}
              </div>
            </div>
            <div className="t-right">
              {inRepertoire.has(t.id) ? (
                <span className="t-in">{copy.library.inRepertoire}</span>
              ) : (
                <button onClick={() => add(t)} disabled={adding !== null}>
                  {copy.library.add}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pager page={currentPage} pageCount={pageCount} onPage={setPage} />
    </>
  );
}
