import { useMemo, useState } from "react";
import { useTunes } from "../hooks/useTunes";
import { daysUntil } from "../lib/dates";
import type { Tune } from "../lib/types";
import { TuneModal } from "../components/TuneModal";

const PAGE_SIZE = 25;

export function Tunes() {
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

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  // Clamp during render so a shrinking result set (new search, deletion) can't
  // strand us on an empty page without needing an effect to reset state.
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

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
          placeholder="Search tunes…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button onClick={openAdd}>+ Add</button>
      </div>
      <div className="tune-count">
        {list.length} of {tunes.length} tunes
      </div>
      <div>
        {pageItems.map((t) => {
          const d = daysUntil(t.due);
          const dueTxt = d <= 0 ? "due now" : d === 1 ? "due tomorrow" : `due in ${d}d`;
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
                  {t.recordingPath && <span className="mic" title="Has recording">&#9679;</span>}
                </div>
                <div className="t-sub">{t.type}</div>
              </div>
              <div className="t-right">
                <div className="t-bpm">{t.tempo}</div>
                <div className={`t-due${d <= 0 ? " due-now" : ""}`}>{dueTxt}</div>
              </div>
            </div>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="pager">
          <button onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
            ‹ Prev
          </button>
          <span className="pager-status">
            Page {currentPage} of {pageCount}
          </span>
          <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>
            Next ›
          </button>
        </div>
      )}

      <TuneModal open={modalOpen} tune={editing} onClose={() => setModalOpen(false)} />
    </>
  );
}
