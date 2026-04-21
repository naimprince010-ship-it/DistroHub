interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  totalRows,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <span>{totalRows} items</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-border bg-card px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-border bg-card px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

