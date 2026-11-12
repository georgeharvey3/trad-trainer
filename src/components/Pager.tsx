import { copy } from "../copy";

export function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="pager">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}>
        {copy.pager.prev}
      </button>
      <span className="pager-status">{copy.pager.status(page, pageCount)}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
        {copy.pager.next}
      </button>
    </div>
  );
}
