"use client";

import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pageSizeOptions = [5, 10, 15] as const;

type AdminRecordPaginationLabels = Readonly<{
  next: string;
  of: string;
  page: string;
  previous: string;
  results: string;
}>;

export function useAdminRecordPagination<T>(items: readonly T[]) {
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(5);
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, safePage]);

  function changePageSize(value: string): void {
    const nextPageSize = Number(value);

    if (
      !pageSizeOptions.includes(
        nextPageSize as (typeof pageSizeOptions)[number],
      )
    ) {
      return;
    }

    setPageSize(nextPageSize as (typeof pageSizeOptions)[number]);
    setPage(1);
  }

  function changePage(nextPage: number): void {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  }

  return {
    changePageSize,
    page: safePage,
    pageItems,
    pageSize,
    setPage: changePage,
    totalItems,
    totalPages,
  } as const;
}

export function AdminRecordPagination({
  labels,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalItems,
  totalPages,
}: Readonly<{
  labels: AdminRecordPaginationLabels;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: string) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>) {
  const selectLabelId = useId();

  if (totalItems <= pageSizeOptions[0]) {
    return null;
  }

  const firstVisibleItem = (page - 1) * pageSize + 1;
  const lastVisibleItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="sr-only" id={selectLabelId}>
          {labels.results}
        </span>
        <Select onValueChange={onPageSizeChange} value={String(pageSize)}>
          <SelectTrigger
            aria-labelledby={selectLabelId}
            className="h-9 w-20 rounded-xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {firstVisibleItem}–{lastVisibleItem} {labels.of} {totalItems}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          {labels.previous}
        </Button>
        <span className="text-sm text-muted-foreground">
          {labels.page} {page} {labels.of} {totalPages}
        </span>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          {labels.next}
        </Button>
      </div>
    </div>
  );
}
