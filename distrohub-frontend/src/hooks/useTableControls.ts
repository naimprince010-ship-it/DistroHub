import { useMemo, useState } from 'react';

type SortDirection = 'asc' | 'desc';

export function useTableControls<T>(
  rows: T[],
  options: {
    initialSortKey: keyof T;
    initialDirection?: SortDirection;
    pageSize?: number;
  }
) {
  const [sortKey, setSortKey] = useState<keyof T>(options.initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(options.initialDirection ?? 'asc');
  const [page, setPage] = useState(1);
  const pageSize = options.pageSize ?? 10;

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDirection === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const resetPage = () => setPage(1);

  return {
    sortKey,
    sortDirection,
    setPage,
    page: safePage,
    pageSize,
    totalPages,
    totalRows: sortedRows.length,
    paginatedRows,
    toggleSort,
    resetPage,
  };
}

