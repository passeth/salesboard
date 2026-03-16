import { Badge } from "@/components/ui/badge";
import { ShipmentWithOrder } from "@/lib/queries/shipments";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function renderShipmentStatusBadge(status: ShipmentWithOrder["shipping_status"]) {
  const className = {
    preparing: "bg-gray-100 text-gray-800",
    packed: "bg-blue-100 text-blue-800",
    shipped: "bg-yellow-100 text-yellow-800",
    in_transit: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
  }[status];

  return (
    <Badge className={cn("capitalize", className)}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export const shipmentsColumns: ColumnDef<ShipmentWithOrder>[] = [
  {
    accessorKey: "shipment_no",
    header: "Shipment No",
    cell: ({ row }) => (
      <Link
        href={`/logistics/shipments/${row.original.id}`}
        className="font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.shipment_no}
      </Link>
    ),
  },
  {
    id: "order_no",
    header: "Order No",
    enableSorting: false,
    accessorFn: (row) => row.order?.order_no ?? "-",
    cell: ({ row }) => row.original.order?.order_no ?? "-",
  },
  {
    id: "buyer",
    header: "Buyer",
    enableSorting: false,
    accessorFn: (row) => row.order?.organization?.name ?? "-",
    cell: ({ row }) => row.original.order?.organization?.name ?? "-",
  },
  {
    accessorKey: "shipping_status",
    header: "Status",
    cell: ({ row }) => renderShipmentStatusBadge(row.original.shipping_status),
  },
  {
    accessorKey: "forwarder_name",
    header: "Forwarder",
    cell: ({ row }) => row.original.forwarder_name ?? "-",
  },
  {
    accessorKey: "etd",
    header: "ETD",
    cell: ({ row }) => formatDate(row.original.etd),
  },
  {
    accessorKey: "eta",
    header: "ETA",
    cell: ({ row }) => formatDate(row.original.eta),
  },
  {
    accessorKey: "tracking_no",
    header: "Tracking No",
    cell: ({ row }) => row.original.tracking_no ?? "-",
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];
