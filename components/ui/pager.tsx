"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pager({
  page,
  pageCount,
  onPage,
  total,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  total?: number;
}) {
  if (pageCount <= 1) {
    return total !== undefined ? <p className="text-sm text-ink-400">{total} total</p> : null;
  }
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-ink-300">
      <span>
        Page {page + 1} of {pageCount}
        {total !== undefined && <span className="text-ink-400"> · {total} total</span>}
      </span>
      <div className="flex gap-1">
        <Button size="icon" variant="outline" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button size="icon" variant="outline" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
