"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ProductRow } from "@/types/database";
import { ColumnDef } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";

const PRODUCT_STATUS_BADGE_CLASS: Record<ProductRow["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-red-100 text-red-800",
};

type ColumnsOptions = {
  onRowCheckboxClick?: (rowIndex: number, shiftKey: boolean) => void;
};

export function getProductsColumns(options?: ColumnsOptions): ColumnDef<ProductRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="px-1"
          onClick={(e) => {
            e.stopPropagation();
            if (options?.onRowCheckboxClick) {
              options.onRowCheckboxClick(row.index, e.shiftKey);
            } else {
              row.toggleSelected(!row.getIsSelected());
            }
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={() => {}}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      size: 40,
    },
    {
      id: "image",
      header: "Image",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="size-9 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden border border-border">
          {row.original.image_url ? (
            <img src={row.original.image_url} alt={row.original.name} className="size-full object-cover" />
          ) : (
            <PackageSearch className="size-4 text-muted-foreground" />
          )}
        </div>
      ),
      size: 50,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium whitespace-normal break-words">{row.original.name}</span>
      ),
      size: 280,
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="font-mono text-sm whitespace-nowrap">{row.original.sku}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => (
        <span className="whitespace-normal break-words">{row.original.brand ?? "-"}</span>
      ),
      size: 120,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="whitespace-normal break-words">{row.original.category ?? "-"}</span>
      ),
      size: 120,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status === "inactive" ? "inactive" : "active";
        return (
          <Badge className={cn("capitalize", PRODUCT_STATUS_BADGE_CLASS[status])}>{status}</Badge>
        );
      },
      size: 90,
    },
  ];
}
