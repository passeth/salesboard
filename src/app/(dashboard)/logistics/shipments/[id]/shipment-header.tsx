"use client";

import { updateShipmentStatus } from "@/app/(dashboard)/logistics/_actions/logistics-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShipmentWithOrder } from "@/lib/queries/shipments";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ShipmentHeaderProps = {
  shipment: ShipmentWithOrder;
};

const NEXT_STATUS: Partial<Record<ShipmentWithOrder["shipping_status"], ShipmentWithOrder["shipping_status"]>> = {
  preparing: "packed",
  packed: "shipped",
  shipped: "in_transit",
  in_transit: "delivered",
};

const STATUS_LABEL: Record<ShipmentWithOrder["shipping_status"], string> = {
  preparing: "Preparing",
  packed: "Packed",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
};

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

  return <Badge className={cn("capitalize", className)}>{STATUS_LABEL[status]}</Badge>;
}

export function ShipmentHeader({ shipment }: ShipmentHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nextStatus = NEXT_STATUS[shipment.shipping_status];

  const handleStatusUpdate = (status: ShipmentWithOrder["shipping_status"]) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await updateShipmentStatus(shipment.id, status);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to update shipment status");
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Shipment No</p>
            <h1 className="text-2xl font-semibold tracking-tight">{shipment.shipment_no}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order No:{" "}
              <Link href={`/sales/orders/${shipment.order_id}`} className="font-medium text-primary hover:underline">
                {shipment.order?.order_no ?? "-"}
              </Link>
            </p>
          </div>
          {renderShipmentStatusBadge(shipment.shipping_status)}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Buyer Organization</p>
            <p className="font-medium">{shipment.order?.organization?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{shipment.order?.organization?.code ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Forwarder</p>
            <p className="font-medium">{shipment.forwarder_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Shipping Method</p>
            <p className="font-medium">{shipment.shipping_method ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tracking No</p>
            <p className="font-medium">{shipment.tracking_no ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Origin</p>
            <p className="font-medium">{shipment.origin_country_code ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(shipment.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ETD</p>
            <p className="font-medium">{formatDate(shipment.etd)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ETA</p>
            <p className="font-medium">{formatDate(shipment.eta)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button variant="outline" asChild>
            <Link href={`/logistics/shipments/${shipment.id}/packing`}>Open Final Packing</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/logistics/shipments/${shipment.id}/packing-list`}>Open Packing List</Link>
          </Button>
          {nextStatus ? (
            <Button disabled={isPending} onClick={() => handleStatusUpdate(nextStatus)}>
              Mark as {STATUS_LABEL[nextStatus]}
            </Button>
          ) : null}
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
