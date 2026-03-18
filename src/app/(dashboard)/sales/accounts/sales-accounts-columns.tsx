"use client";

import type { SalesAccountSummary } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

export const salesAccountsColumns: ColumnDef<SalesAccountSummary>[] = [
  {
    accessorKey: "org_name",
    header: "Account Name",
    cell: ({ row }) => (
      <Link
        href={`/sales/accounts/${row.original.org_id}`}
        className="font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.org_name}
      </Link>
    ),
  },
  {
    accessorKey: "country_name",
    header: "Country",
    cell: ({ row }) => row.original.country_name ?? "-",
  },
  {
    accessorKey: "currency_code",
    header: "Currency",
    cell: ({ row }) => row.original.currency_code ?? "-",
  },
  {
    id: "channel",
    header: "Channel",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.vendor_name ? (
        <span className="text-amber-600">{row.original.vendor_name}</span>
      ) : (
        <span className="text-muted-foreground">Direct</span>
      ),
  },
  {
    accessorKey: "sales_user_name",
    header: "Sales Owner",
    cell: ({ row }) => row.original.sales_user_name ?? "-",
  },
  {
    accessorKey: "order_count",
    header: "Orders",
    cell: ({ row }) => row.original.order_count.toLocaleString(),
  },
  {
    accessorKey: "priced_product_count",
    header: "Priced Items",
    cell: ({ row }) => row.original.priced_product_count.toLocaleString(),
  },
  {
    accessorKey: "last_order_date",
    header: "Last Order",
    cell: ({ row }) => formatDate(row.original.last_order_date),
  },
];
