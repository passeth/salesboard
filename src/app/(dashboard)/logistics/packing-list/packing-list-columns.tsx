import { Badge } from "@/components/ui/badge";
import { LogisticsPackingListOrder } from "@/lib/queries/orders";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function renderShipmentStatusBadge(status: NonNullable<LogisticsPackingListOrder["shipment"]>["shipping_status"]) {
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

export const packingListColumns: ColumnDef<LogisticsPackingListOrder>[] = [
  {
    accessorKey: "order_no",
    header: "Order No",
    cell: ({ row }) => (
      <Link
        href={`/logistics/packing-list/${row.original.id}`}
        className="font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.order_no}
      </Link>
    ),
  },
  {
    id: "shipment_no",
    header: "Shipment",
    accessorFn: (row) => row.shipment?.shipment_no ?? "Draft from order",
    cell: ({ row }) => row.original.shipment?.shipment_no ?? "Draft from order",
  },
  {
    id: "buyer",
    header: "Buyer",
    accessorFn: (row) => row.organization?.name ?? "-",
    cell: ({ row }) => row.original.organization?.name ?? "-",
  },
  {
    accessorKey: "status",
    header: "Order Status",
    cell: ({ row }) => row.original.status.replaceAll("_", " "),
  },
  {
    id: "shipment_status",
    header: "Shipment Status",
    accessorFn: (row) => row.shipment?.shipping_status ?? "-",
    cell: ({ row }) =>
      row.original.shipment ? renderShipmentStatusBadge(row.original.shipment.shipping_status) : "Not created",
  },
  {
    id: "destination",
    header: "Destination",
    accessorFn: (row) => row.ship_to?.name ?? "-",
    cell: ({ row }) => row.original.ship_to?.name ?? "-",
  },
  {
    id: "etd",
    header: "ETD",
    accessorFn: (row) => row.shipment?.etd ?? null,
    cell: ({ row }) => formatDate(row.original.shipment?.etd ?? null),
  },
  {
    accessorKey: "confirmed_at",
    header: "Confirmed",
    cell: ({ row }) => formatDate(row.original.confirmed_at),
  },
];
