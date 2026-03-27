import { cloneOrderToDraft } from "@/app/(dashboard)/buyer/_actions/decision-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OrderEventRow, OrderItemWithProduct, OrderStatus, OrderWithOrg, ShipmentRow } from "@/types";
import { OrganizationRow } from "@/types";
import { Boxes, Check, DollarSign, Package, Truck } from "lucide-react";
import { CancelOrderButton } from "./cancel-order-button";
import { ShipToSelector } from "./ship-to-selector";

type OrderSummaryHeaderProps = {
  order: OrderWithOrg;
  items: OrderItemWithProduct[];
  shipments: ShipmentRow[];
  events: OrderEventRow[];
  shipToOrgs: Pick<OrganizationRow, "id" | "name" | "code">[];
};

const STEPPER_STEPS = [
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  { key: "review", label: "Review", statuses: ["vendor_review", "sales_review", "needs_buyer_decision"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "shipping", label: "Shipping", statuses: ["invoiced", "partially_shipped", "shipped"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
] as const;

function getStepIndex(status: string): number {
  return STEPPER_STEPS.findIndex((s) => (s.statuses as readonly string[]).includes(status));
}

function formatShortDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrencyValue(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

export function OrderSummaryHeader({ order, items, shipments, events, shipToOrgs }: OrderSummaryHeaderProps) {
  const totalAmount = items.reduce((sum, item) => {
    if (item.unit_price === null) return sum;
    return sum + item.unit_price * item.requested_qty;
  }, 0);

  const totalQty = items.reduce((sum, item) => sum + item.requested_qty, 0);
  const shipmentCount = shipments.length > 0 ? shipments.length : null;
  const currency = order.organization?.currency_code || order.currency_code || "USD";

  const currentStepIndex = getStepIndex(order.status);

  const stepDates = new Map<string, string>();
  for (const event of events) {
    if (!event.to_status) continue;
    const stepIdx = STEPPER_STEPS.findIndex((s) => (s.statuses as readonly string[]).includes(event.to_status!));
    if (stepIdx >= 0) {
      const key = STEPPER_STEPS[stepIdx].key;
      if (!stepDates.has(key)) {
        stepDates.set(key, event.created_at);
      }
    }
  }

  return (
    <Card className="rounded-xl border-t-4 border-t-primary">
      <CardContent className="space-y-5 p-4">
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

        <div className="flex items-start justify-between gap-1">
          {STEPPER_STEPS.map((step, idx) => {
            const isPast = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;
            const isFuture = currentStepIndex < idx;
            const date = stepDates.get(step.key);

            return (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        isPast || isCurrent ? "bg-primary" : "bg-muted-foreground/20",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      isPast && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2",
                      isFuture && "border border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {isPast ? <Check className="size-3.5" /> : idx + 1}
                  </div>
                  {idx < STEPPER_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        isPast ? "bg-primary" : "bg-muted-foreground/20",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isCurrent ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {date ? (
                  <span className="text-[10px] text-muted-foreground">{formatShortDate(date)}</span>
                ) : (
                  <span className="text-[10px] text-transparent">—</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="font-medium">{order.organization?.name ?? "-"}</p>
            {order.organization?.code ? (
              <p className="text-xs text-muted-foreground">{order.organization.code}</p>
            ) : null}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Ship To</p>
            {["draft", "submitted"].includes(order.status) && shipToOrgs.length > 0 ? (
              <ShipToSelector
                orderId={order.id}
                currentShipToId={order.ship_to_org_id}
                shipToOrgs={shipToOrgs}
              />
            ) : (
              <>
                <p className="font-medium">{order.ship_to?.name ?? "-"}</p>
                {order.ship_to?.code ? (
                  <p className="text-xs text-muted-foreground">{order.ship_to.code}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Requested Delivery</p>
            <p className="font-medium">{formatDate(order.requested_delivery_date)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Confirmed Delivery</p>
            <p className="font-medium">{formatDate(order.confirmed_delivery_date)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5">
            <Package className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Items</span>
            <span className="text-sm font-semibold">{items.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5">
            <Boxes className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Boxes</span>
            <span className="text-sm font-semibold">{totalQty.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5">
            <Truck className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Shipments</span>
            <span className="text-sm font-semibold">{shipmentCount ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5">
            <DollarSign className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{currency}</span>
            <span className="text-sm font-semibold">
              {totalAmount > 0 ? formatCurrencyValue(totalAmount, currency) : "—"}
            </span>
          </div>
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
