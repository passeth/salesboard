"use client";

import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { InventoryProductSummary, LotFifoEntry } from "@/types";
import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type InventoryTableProps = {
  products: InventoryProductSummary[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSort?: string;
  currentSortDir?: string;
};

type StockLot = LotFifoEntry & {
  in_stock: number;
  is_partial: boolean;
};

/**
 * FIFO reverse-calculation: oldest lots are consumed first,
 * so current stock is composed of the NEWEST lots.
 * Walk from newest → oldest, allocating until current_stock is filled.
 * The oldest remaining lot may be partially consumed.
 */
function computeStockLots(allLots: LotFifoEntry[], currentStock: number): StockLot[] {
  const newestFirst = [...allLots].reverse();
  let remaining = currentStock;
  const result: StockLot[] = [];

  for (const lot of newestFirst) {
    if (remaining <= 0) break;
    const allocated = Math.min(lot.qty, remaining);
    result.push({
      ...lot,
      in_stock: allocated,
      is_partial: allocated < lot.qty,
    });
    remaining -= allocated;
  }

  return result;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

function StockLotLine({ lot }: { lot: StockLot }) {
  return (
    <div className="flex items-baseline gap-2 text-xs leading-5">
      <span className="shrink-0 font-mono text-muted-foreground">{lot.lot_no}</span>
      <span className="shrink-0 text-muted-foreground">{formatDate(lot.mfg_date)}</span>
      <span className={cn("shrink-0 tabular-nums", lot.is_partial ? "font-semibold text-amber-600" : "text-muted-foreground")}>
        {lot.in_stock.toLocaleString()}
      </span>
    </div>
  );
}

const inventoryColumns: ColumnDef<InventoryProductSummary>[] = [
  {
    accessorKey: "image_url",
    header: "Image",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="size-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
        {row.original.image_url ? (
          <Image
            src={row.original.image_url}
            alt={row.original.name}
            width={40}
            height={40}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">-</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span>,
  },
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => <span className="max-w-[200px] truncate font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "current_stock",
    header: "Current Stock",
    cell: ({ row }) => {
      const stock = row.original.current_stock;
      if (stock === 0) {
        return <span className="text-xs text-muted-foreground">Not synced</span>;
      }
      return <span className="tabular-nums font-semibold">{stock.toLocaleString()}</span>;
    },
  },
  {
    id: "lot_count",
    header: "Lots",
    enableSorting: false,
    cell: ({ row }) => {
      const allLots = row.original.lots_fifo ?? [];
      if (allLots.length === 0) return <span className="text-muted-foreground">-</span>;
      const effectiveStock = row.original.current_stock > 0 ? row.original.current_stock : row.original.total_produced;
      const stockLots = computeStockLots(allLots, effectiveStock);
      return <span className="tabular-nums">{stockLots.length}</span>;
    },
  },
  {
    id: "lots_fifo",
    header: "Stock Composition (FIFO)",
    enableSorting: false,
    cell: ({ row }) => {
      const allLots = row.original.lots_fifo ?? [];
      if (allLots.length === 0) return <span className="text-muted-foreground">-</span>;

      const effectiveStock = row.original.current_stock > 0 ? row.original.current_stock : row.original.total_produced;
      const stockLots = computeStockLots(allLots, effectiveStock);

      return (
        <div className="min-w-[260px]">
          {stockLots.map((lot) => (
            <StockLotLine key={lot.lot_no} lot={lot} />
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "planned_qty",
    header: "Planned",
    enableSorting: false,
    cell: ({ row }) => {
      const qty = row.original.planned_qty;
      if (qty === 0) return <span className="text-muted-foreground">-</span>;
      return <span className="tabular-nums text-blue-600">+{qty.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "committed_qty",
    header: "Committed",
    enableSorting: false,
    cell: ({ row }) => {
      const qty = row.original.committed_qty;
      if (qty === 0) return <span className="text-muted-foreground">-</span>;
      return <span className="tabular-nums text-orange-600">-{qty.toLocaleString()}</span>;
    },
  },
  {
    id: "available_stock",
    header: "Available",
    enableSorting: false,
    cell: ({ row }) => {
      const current = row.original.current_stock;
      const planned = row.original.planned_qty;
      const committed = row.original.committed_qty;
      if (current === 0 && planned === 0 && committed === 0) {
        return <span className="text-muted-foreground">-</span>;
      }
      const available = current + planned - committed;
      return (
        <span className={cn("tabular-nums font-semibold", available < 0 && "text-red-600")}>
          {available.toLocaleString()}
        </span>
      );
    },
  },
];

export function InventoryTable({
  products,
  totalCount,
  currentPage,
  pageSize,
  currentSort,
  currentSortDir,
}: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const sorting: SortingState = currentSort
    ? [{ id: currentSort, desc: currentSortDir !== "asc" }]
    : [];

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const next = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
    const params = new URLSearchParams(searchParams.toString());

    if (next.length > 0) {
      params.set("sort", next[0].id);
      params.set("sortDir", next[0].desc ? "desc" : "asc");
    } else {
      params.delete("sort");
      params.delete("sortDir");
    }

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const table = useReactTable({
    data: products,
    columns: inventoryColumns,
    state: {
      sorting,
    },
    manualSorting: true,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
  });

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No inventory found"
        description="Try adjusting your search."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="max-h-[700px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={updatePage}
      />
    </div>
  );
}
