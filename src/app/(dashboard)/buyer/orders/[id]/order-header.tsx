import { cloneOrderToDraft } from "@/app/(dashboard)/buyer/_actions/decision-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderItemWithProduct, OrderStatus, OrderWithOrg } from "@/types";
import { CancelOrderButton } from "./cancel-order-button";

type OrderHeaderProps = {
  order: OrderWithOrg;
  items?: OrderItemWithProduct[];
};

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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

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

export function OrderHeader({ order, items }: OrderHeaderProps) {
  const totalAmount = (items ?? []).reduce((sum, item) => {
    if (item.unit_price === null) return sum;
    return sum + item.unit_price * item.requested_qty;
  }, 0);
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Order No</p>
            <h1 className="text-2xl font-semibold tracking-tight">{order.order_no}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status as OrderStatus} />
            <form action={cloneOrderToDraft.bind(null, order.id)}>
              <Button type="submit" variant="outline">
                Re-order
              </Button>
            </form>
            {["draft", "submitted"].includes(order.status) ? (
              <CancelOrderButton orderId={order.id} />
            ) : null}
          </div>
        </div>

        {order.status_reason ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Reason:</span> {order.status_reason}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Organization</p>
            <p className="font-medium">{order.organization?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{order.organization?.code ?? ""}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ship To</p>
            <p className="font-medium">{order.ship_to?.name ?? "-"}</p>
            {order.ship_to?.code ? (
              <p className="text-xs text-muted-foreground">{order.ship_to.code}</p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{order.currency_code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium">{formatDateTime(order.submitted_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Requested Delivery</p>
            <p className="font-medium">{formatDate(order.requested_delivery_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confirmed Delivery</p>
            <p className="font-medium">{formatDate(order.confirmed_delivery_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDateTime(order.created_at)}</p>
          </div>
          {totalAmount > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold">{formatCurrencyValue(totalAmount, order.currency_code)}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
