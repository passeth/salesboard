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

function renderPlanningStageBadge(row: LogisticsPackingListOrder) {
  if (row.shipment) {
    return <Badge variant="outline">Final Stage</Badge>;
  }

  if (row.packing_draft?.draft_status === "draft") {
    return <Badge variant="secondary">Draft Saved</Badge>;
  }

  if (row.packing_draft?.draft_status === "promoted") {
    return <Badge variant="outline">Promoted</Badge>;
  }

  return <Badge variant="outline">Draft Not Started</Badge>;
}

export const packingColumns: ColumnDef<LogisticsPackingListOrder>[] = [
  {
    accessorKey: "order_no",
    header: "Order No",
    cell: ({ row }) => (
      <Link
        href={`/logistics/packing/${row.original.id}`}
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
    accessorFn: (row) => row.shipment?.shipment_no ?? "Not created",
    cell: ({ row }) => row.original.shipment?.shipment_no ?? "Not created",
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
    id: "planning_stage",
    header: "Planning Stage",
    accessorFn: (row) => row.shipment?.id ?? row.packing_draft?.draft_status ?? "not_started",
    cell: ({ row }) => renderPlanningStageBadge(row.original),
  },
  {
    id: "shipment_status",
    header: "Shipment Status",
    accessorFn: (row) => row.shipment?.shipping_status ?? "-",
    cell: ({ row }) =>
      row.original.shipment ? renderShipmentStatusBadge(row.original.shipment.shipping_status) : "Planned from order",
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
