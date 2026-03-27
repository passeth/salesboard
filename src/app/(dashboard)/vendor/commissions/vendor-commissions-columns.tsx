import { VendorCommissionWithOrder } from "@/lib/queries/vendor";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

export const vendorCommissionsColumns: ColumnDef<VendorCommissionWithOrder>[] = [
  {
    id: "order_no",
    header: "Order No",
    enableSorting: false,
    accessorFn: (row) => row.order?.order_no ?? "-",
    cell: ({ row }) => {
      const order = row.original.order;
      if (!order) return "-";
      return (
        <Link
          href={`/vendor/orders/${row.original.order_id}`}
          className="font-medium text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {order.order_no}
        </Link>
      );
    },
  },
  {
    accessorKey: "buyer_name",
    header: "Buyer",
    enableSorting: false,
  },
  {
    id: "commission_info",
    header: "Commission",
    enableSorting: false,
    cell: ({ row }) => {
      const { commission_type, commission_value } = row.original;
      if (commission_type === "rate") return `${commission_value}%`;
      return `$${commission_value.toLocaleString()}`;
    },
  },
  {
    accessorKey: "commission_amount",
    header: "Amount",
    cell: ({ row }) => `$${Number(row.original.commission_amount).toLocaleString()}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      const color =
        s === "paid"
          ? "text-green-700 bg-green-50"
          : s === "approved"
            ? "text-blue-700 bg-blue-50"
            : s === "cancelled"
              ? "text-red-700 bg-red-50"
              : "text-amber-700 bg-amber-50";
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "payable_date",
    header: "Payable Date",
    cell: ({ row }) => formatDate(row.original.payable_date),
  },
  {
    accessorKey: "paid_at",
    header: "Paid",
    cell: ({ row }) => formatDate(row.original.paid_at),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];
