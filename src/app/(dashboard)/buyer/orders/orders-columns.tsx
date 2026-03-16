import { StatusBadge } from "@/components/status-badge";
import { OrderWithOrg, OrderStatus } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ordersColumns: ColumnDef<OrderWithOrg>[] = [
  {
    accessorKey: "order_no",
    header: "Order No",
    cell: ({ row }) => (
      <Link
        href={`/buyer/orders/${row.original.id}`}
        className="font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.order_no}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status as OrderStatus} />,
  },
  {
    id: "organization_name",
    header: "Organization",
    enableSorting: false,
    accessorFn: (row) => row.organization?.name ?? "-",
    cell: ({ row }) => row.original.organization?.name ?? "-",
  },
  {
    id: "ship_to_name",
    header: "Ship To",
    enableSorting: false,
    accessorFn: (row) => row.ship_to?.name ?? "-",
    cell: ({ row }) => row.original.ship_to?.name ?? "-",
  },
  {
    accessorKey: "currency_code",
    header: "Currency",
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
