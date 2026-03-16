import { cloneOrderToDraft } from "@/app/(dashboard)/buyer/_actions/decision-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderItemWithProduct, OrderStatus, OrderWithOrg, ShipmentRow } from "@/types";
import { Boxes, Calendar, DollarSign, FileText, Package, Truck } from "lucide-react";
import { CancelOrderButton } from "./cancel-order-button";

type OrderSummaryHeaderProps = {
  order: OrderWithOrg;
  items: OrderItemWithProduct[];
  shipments: ShipmentRow[];
};

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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

function formatCurrencyValue(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function OrderSummaryHeader({ order, items, shipments }: OrderSummaryHeaderProps) {
  const totalAmount = items.reduce((sum, item) => {
    if (item.unit_price === null) return sum;
    return sum + item.unit_price * item.requested_qty;
  }, 0);

  const totalQty = items.reduce((sum, item) => sum + item.requested_qty, 0);
  const palletCount = shipments.length > 0 ? shipments.length : null;

  return (
    <Card className="sticky top-0 z-10 rounded-xl border-t-4 border-t-primary">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Order No</p>
              <h1 className="text-xl font-semibold tracking-tight">{order.order_no}</h1>
            </div>
            <StatusBadge status={order.status as OrderStatus} />
          </div>
          <div className="flex items-center gap-2">
            <form action={cloneOrderToDraft.bind(null, order.id)}>
              <Button type="submit" variant="outline" size="sm">
                Re-order
              </Button>
            </form>
            {["draft", "submitted"].includes(order.status) ? (
              <CancelOrderButton orderId={order.id} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="font-medium">{order.organization?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{order.organization?.code ?? ""}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ship To</p>
            <p className="font-medium">{order.ship_to?.name ?? "-"}</p>
            {order.ship_to?.code ? (
              <p className="text-xs text-muted-foreground">{order.ship_to.code}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{order.currency_code}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Items</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{items.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Boxes</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{totalQty.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Shipments</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{palletCount ?? "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Amount</span>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {totalAmount > 0 ? formatCurrencyValue(totalAmount, order.currency_code) : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Status</span>
            </div>
            <p className="mt-1 text-sm font-medium capitalize">{order.status.replace(/_/g, " ")}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Submitted</span>
            </div>
            <p className="mt-1 text-sm font-medium">{formatDateTime(order.submitted_at)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>Requested Delivery: {formatDate(order.requested_delivery_date)}</span>
          <span>Confirmed Delivery: {formatDate(order.confirmed_delivery_date)}</span>
          <span>Created: {formatDateTime(order.created_at)}</span>
        </div>

        {order.status_reason ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <span className="font-medium">Reason:</span> {order.status_reason}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
