import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProductRow } from "@/types/database";
import { ColumnDef } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";

const PRODUCT_STATUS_BADGE_CLASS: Record<ProductRow["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-red-100 text-red-800",
};

export const productsColumns: ColumnDef<ProductRow>[] = [
  {
    id: "image",
    header: "Image",
    cell: ({ row }) => (
      <div className="size-9 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden border border-border">
        {row.original.image_url ? (
          <img src={row.original.image_url} alt={row.original.name} className="size-full object-cover" />
        ) : (
          <PackageSearch className="size-4 text-muted-foreground" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span>,
  },
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => row.original.brand ?? "-",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.original.category ?? "-",
  },
  {
    accessorKey: "units_per_case",
    header: "Units/Case",
    cell: ({ row }) => row.original.units_per_case ?? "-",
  },
  {
    accessorKey: "cbm",
    header: "CBM",
    cell: ({ row }) => (row.original.cbm != null ? row.original.cbm.toFixed(4) : "-"),
  },
  {
    accessorKey: "barcode",
    header: "Barcode",
    cell: ({ row }) => row.original.barcode ?? "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={cn("capitalize", PRODUCT_STATUS_BADGE_CLASS[row.original.status])}>
        {row.original.status}
      </Badge>
    ),
  },
];
