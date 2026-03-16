"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  page: number;
  pageSize: number;
  totalCount: number;
  loading?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  pageSizeOptions?: number[];
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  page,
  pageSize,
  totalCount,
  loading = false,
  sorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  onRowClick,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting filters and search terms.",
  className,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const activeSorting = sorting ?? internalSorting;

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: Math.max(page - 1, 0),
      pageSize,
    }),
    [page, pageSize],
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.max(Math.ceil(totalCount / pageSize), 1),
    state: {
      sorting: activeSorting,
      pagination,
    },
    manualPagination: true,
    manualSorting: true,
    onSortingChange: onSortingChange ?? setInternalSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const headerCount = Math.max(columns.length, 1);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const renderHeader = header.column.columnDef.header;
                const canSort = header.column.getCanSort();

                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort && typeof renderHeader === "string" ? (
                      <DataTableColumnHeader column={header.column} title={renderHeader} />
                    ) : (
                      flexRender(renderHeader, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading
            ? Array.from({ length: Math.min(pageSize, 8) }).map((_, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`}>
                  {Array.from({ length: headerCount }).map((__, colIndex) => (
                    <TableCell key={`loading-${rowIndex}-${colIndex}`}>
                      <Skeleton className="h-5 w-full max-w-[180px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(onRowClick ? "cursor-pointer" : undefined)}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (
                <TableRow>
                  <TableCell colSpan={headerCount} className="py-12 text-center">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{emptyTitle}</p>
                      <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
        </TableBody>
      </Table>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
