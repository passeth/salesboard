"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: DataTablePaginationProps) {
  const pageCount = Math.max(Math.ceil(totalCount / pageSize), 1);
  const clampedPage = Math.min(Math.max(page, 1), pageCount);
  const from = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const to = Math.min(clampedPage * pageSize, totalCount);

  return (
    <div className={cn("flex flex-col gap-3 border-t px-2 py-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-sm text-muted-foreground">
        Showing {from}-{to} of {totalCount}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-[88px]">
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
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(clampedPage - 1)}
            disabled={clampedPage <= 1}
          >
            Previous
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            Page {clampedPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(clampedPage + 1)}
            disabled={clampedPage >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
