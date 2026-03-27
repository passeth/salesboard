import { StatusBadge } from "@/components/status-badge";
import { VendorOrderWithCounts } from "@/lib/queries/vendor";
import { OrderStatus } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const vendorOrdersColumns: ColumnDef<VendorOrderWithCounts>[] = [
  {
    accessorKey: "order_no",
    header: "Order No",
    cell: ({ row }) => (
      <Link
        href={`/vendor/orders/${row.original.id}`}
        className="font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.order_no}
      </Link>
    ),
  },
  {
    id: "organization_name",
    header: "Buyer",
    enableSorting: false,
    accessorFn: (row) => row.organization?.name ?? "-",
    cell: ({ row }) => row.original.organization?.name ?? "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status as OrderStatus} />,
  },
  {
    id: "items_count",
    header: "Items",
    enableSorting: false,
    accessorFn: (row) => row.order_items?.[0]?.count ?? 0,
    cell: ({ row }) => row.original.order_items?.[0]?.count ?? 0,
  },
  {
    accessorKey: "vendor_commission_amount",
    header: "Commission",
    cell: ({ row }) => {
      const amount = row.original.vendor_commission_amount;
      if (amount == null) return "-";
      return `$${Number(amount).toLocaleString()}`;
    },
  },
  {
    accessorKey: "requested_delivery_date",
    header: "Requested Delivery",
    cell: ({ row }) => formatDate(row.original.requested_delivery_date),
  },
  {
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) => formatDateTime(row.original.submitted_at),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
];
