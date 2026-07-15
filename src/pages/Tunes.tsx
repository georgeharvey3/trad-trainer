import { useMemo, useState } from "react";
import { useTunes } from "../hooks/useTunes";
import { daysUntil } from "../lib/dates";
import type { Tune } from "../lib/types";
import { TuneModal } from "../components/TuneModal";

export function Tunes() {
  const tunesQ = useTunes();
  const [search, setSearch] = useState("");
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
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={openAdd}>+ Add</button>
      </div>
      <div className="tune-count">
        {list.length} of {tunes.length} tunes
      </div>
      <div>
        {list.map((t) => {
          const d = daysUntil(t.due);
          const dueTxt = d <= 0 ? "due now" : d === 1 ? "due tomorrow" : `due in ${d}d`;
          return (
            <div key={t.id} className="tune-row" onClick={() => openEdit(t)}>
              <div className="t-main">
                <div className="t-title">
                  {t.title}
                  {t.recordingPath && <span className="mic" title="Has recording">&#127908;</span>}
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

      <TuneModal open={modalOpen} tune={editing} onClose={() => setModalOpen(false)} />
    </>
  );
}
