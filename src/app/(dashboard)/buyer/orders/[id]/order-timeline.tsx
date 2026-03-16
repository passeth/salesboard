import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderEventRow } from "@/types";

type OrderTimelineProps = {
  events: OrderEventRow[];
};

const BUYER_VISIBLE_EVENTS = new Set<OrderEventRow["event_type"]>([
  "submitted",
  "vendor_adjusted",
  "sales_adjusted",
  "buyer_decision_requested",
  "buyer_decision_received",
  "invoice_issued",
  "shipment_confirmed",
]);

const EVENT_LABELS: Record<OrderEventRow["event_type"], string> = {
  submitted: "Order Submitted",
  vendor_approved: "Vendor Approved",
  vendor_adjusted: "Vendor Adjusted Quantity",
  sales_approved: "Sales Approved",
  sales_adjusted: "Sales Adjusted Quantity",
  buyer_decision_requested: "Buyer Decision Requested",
  buyer_decision_received: "Buyer Decision Received",
  inventory_shortage: "Inventory Shortage",
  expiry_warning: "Expiry Warning",
  production_reallocated: "Production Reallocated",
  invoice_issued: "Invoice Issued",
  shipment_confirmed: "Shipment Confirmed",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  const visibleEvents = events.filter((event) => BUYER_VISIBLE_EVENTS.has(event.event_type));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <ol className="space-y-4">
            {visibleEvents.map((event, index) => (
              <li key={event.id} className="relative pl-8">
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                {index < visibleEvents.length - 1 ? (
                  <span className="absolute left-[3px] top-4 h-[calc(100%-8px)] w-px bg-border" />
                ) : null}

                <div className="space-y-1">
                  <p className="text-sm font-medium">{EVENT_LABELS[event.event_type]}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
                  {event.from_status || event.to_status ? (
                    <p className="text-xs text-muted-foreground">
                      {event.from_status ?? "-"} -&gt; {event.to_status ?? "-"}
                    </p>
                  ) : null}
                  {event.note ? <p className="text-sm text-muted-foreground">{event.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
