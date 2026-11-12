export const PAGE_SIZE = 25;

/**
 * One page of a list. The page is clamped during render so a shrinking
 * result set (new search, deletion) can't strand us on an empty page.
 */
export function pageSlice<T>(list: T[], page: number) {
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  return { items: list.slice(start, start + PAGE_SIZE), currentPage, pageCount };
}
