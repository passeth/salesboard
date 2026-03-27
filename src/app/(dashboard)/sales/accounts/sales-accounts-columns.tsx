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
    size: 200,
    cell: ({ row }) => (
      <Link
        href={`/sales/accounts/${row.original.org_id}`}
        className="font-medium text-primary hover:underline block truncate"
        onClick={(e) => e.stopPropagation()}
        title={row.original.org_name}
      >
        {row.original.org_name}
      </Link>
    ),
  },
  {
    accessorKey: "country_name",
    header: "Country",
    size: 80,
    cell: ({ row }) => row.original.country_name ?? "-",
  },
  {
    accessorKey: "currency_code",
    header: "Currency",
    size: 70,
    cell: ({ row }) => row.original.currency_code ?? "-",
  },
  {
    id: "vendor",
    header: "Vendor",
    size: 100,
    enableSorting: false,
    cell: ({ row }) =>
      row.original.vendor_name ? (
        <span className="text-amber-600 truncate block" title={row.original.vendor_name}>
          {row.original.vendor_name}
        </span>
      ) : (
        <span className="text-muted-foreground">Direct</span>
      ),
  },
  {
    accessorKey: "sales_user_name",
    header: "Sales Owner",
    size: 110,
    cell: ({ row }) => row.original.sales_user_name ?? "-",
  },
  {
    accessorKey: "submitted_count",
    header: "Submit",
    size: 60,
    cell: ({ row }) => row.original.submitted_count || "—",
  },
  {
    accessorKey: "review_count",
    header: "Review",
    size: 60,
    cell: ({ row }) => row.original.review_count || "—",
  },
  {
    accessorKey: "confirmed_count",
    header: "Confirm",
    size: 60,
    cell: ({ row }) => row.original.confirmed_count || "—",
  },
  {
    accessorKey: "completed_count",
    header: "Done",
    size: 60,
    cell: ({ row }) => row.original.completed_count || "—",
  },
  {
    accessorKey: "priced_product_count",
    header: "Priced Items",
    size: 80,
    cell: ({ row }) => row.original.priced_product_count.toLocaleString(),
  },
  {
    accessorKey: "last_order_date",
    header: "Last Order",
    size: 90,
    cell: ({ row }) => formatDate(row.original.last_order_date),
  },
];
