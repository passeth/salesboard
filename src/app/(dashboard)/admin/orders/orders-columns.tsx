import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, OrderStatus } from "@/types";
import { OrderRow, OrganizationRow, UserRow } from "@/types/database";
import { ColumnDef } from "@tanstack/react-table";
import { OrderStatusCell } from "./order-status-cell";

type AdminOrderRow = OrderRow & {
  organization: Pick<OrganizationRow, "name" | "code"> | null;
  sales_owner: Pick<UserRow, "name" | "email"> | null;
};

const ORDER_STATUS_COLOR_CLASS: Record<string, string> = {
  "status-draft": "bg-status-draft/10 text-status-draft",
  "status-submitted": "bg-status-submitted/10 text-status-submitted",
  "status-vendor-review": "bg-status-vendor-review/10 text-status-vendor-review",
  "status-sales-review": "bg-status-sales-review/10 text-status-sales-review",
  "status-needs-decision": "bg-status-needs-decision/10 text-status-needs-decision",
  "status-confirmed": "bg-status-confirmed/10 text-status-confirmed",
  "status-rejected": "bg-status-rejected/10 text-status-rejected",
  "status-invoiced": "bg-status-invoiced/10 text-status-invoiced",
  "status-partially-shipped": "bg-status-partially-shipped/10 text-status-partially-shipped",
  "status-shipped": "bg-status-shipped/10 text-status-shipped",
  "status-completed": "bg-status-completed/10 text-status-completed",
  "status-cancelled": "bg-status-cancelled/10 text-status-cancelled",
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

export const ordersColumns: ColumnDef<AdminOrderRow>[] = [
  {
    accessorKey: "order_no",
    header: "Order No",
    cell: ({ row }) => <span className="font-mono text-sm tabular-nums font-medium">{row.original.order_no}</span>,
  },
  {
    id: "buyer",
    header: "Buyer",
    enableSorting: false,
    accessorFn: (row) => row.organization?.name ?? "-",
    cell: ({ row }) => row.original.organization?.name ?? "-",
  },
  {
    id: "sales_owner",
    header: "Sales Owner",
    enableSorting: false,
    accessorFn: (row) => row.sales_owner?.name ?? "-",
    cell: ({ row }) => row.original.sales_owner?.name ?? "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <OrderStatusCell
        orderId={row.original.id}
        currentStatus={row.original.status as OrderStatus}
      />
    ),
  },
  {
    accessorKey: "currency_code",
    header: "Currency",
    cell: ({ row }) => row.original.currency_code,
  },
  {
    accessorKey: "requested_delivery_date",
    header: "Requested Delivery Date",
    cell: ({ row }) => formatDate(row.original.requested_delivery_date),
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];
