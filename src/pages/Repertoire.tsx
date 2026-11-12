import { useMemo, useState } from "react";
import { useTunes } from "../hooks/useTunes";
import { daysUntil } from "../lib/dates";
import type { Tune } from "../lib/types";
import { TuneModal } from "../components/TuneModal";
import { Pager } from "../components/Pager";
import { pageSlice } from "../lib/paging";
import { copy } from "../copy";

export function Repertoire() {
  const tunesQ = useTunes();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tune | null>(null);

  const tunes = useMemo(() => tunesQ.data ?? [], [tunesQ.data]);
  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      tunes
        .filter((t) => !q || t.title.toLowerCase().includes(q) || t.type.toLowerCase().includes(q))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [tunes, q],
  );

  const { items: pageItems, currentPage, pageCount } = pageSlice(list, page);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Tune) {
    setEditing(t);
    setModalOpen(true);
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder={copy.repertoire.search}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button onClick={openAdd}>{copy.repertoire.add}</button>
      </div>
      <div className="tune-count">{copy.repertoire.count(list.length, tunes.length)}</div>
      <div>
        {pageItems.map((t) => {
          const d = daysUntil(t.due);
          return (
            <div
              key={t.id}
              className="tune-row"
              role="button"
              tabIndex={0}
              onClick={() => openEdit(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit(t);
                }
              }}
            >
              <div className="t-main">
                <div className="t-title">
                  {t.title}
                  {t.recordingPath && (
                    <span className="mic" title={copy.repertoire.hasRecording}>
                      &#9679;
                    </span>
                  )}
                </div>
                <div className="t-sub">{t.type}</div>
              </div>
              <div className="t-right">
                <div className="t-bpm">{t.tempo}</div>
                <div className={`t-due${d <= 0 ? " due-now" : ""}`}>{copy.repertoire.due(d)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Pager page={currentPage} pageCount={pageCount} onPage={setPage} />

      <TuneModal open={modalOpen} tune={editing} onClose={() => setModalOpen(false)} />
    </>
  );
}
