"use client";

import { VendorAccountSummary } from "@/lib/queries/vendor";
import { ColumnDef } from "@tanstack/react-table";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

export const vendorAccountsColumns: ColumnDef<VendorAccountSummary>[] = [
  {
    accessorKey: "org_name",
    header: "Buyer Name",
    cell: ({ row }) => (
      <span className="font-medium block truncate" title={row.original.org_name}>
        {row.original.org_name}
      </span>
    ),
  },
  {
    accessorKey: "country_code",
    header: "Country",
    size: 70,
    cell: ({ row }) => row.original.country_code ?? "-",
  },
  {
    accessorKey: "order_count",
    header: "Orders",
    size: 70,
    cell: ({ row }) => row.original.order_count,
  },
  {
    accessorKey: "last_order_date",
    header: "Last Order",
    size: 100,
    cell: ({ row }) => formatDate(row.original.last_order_date),
  },
];
