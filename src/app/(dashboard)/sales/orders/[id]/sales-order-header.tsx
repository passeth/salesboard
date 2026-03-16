import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatus, OrderWithOrg } from "@/types";

type SalesOrderHeaderProps = {
  order: OrderWithOrg;
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

export function SalesOrderHeader({ order }: SalesOrderHeaderProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Order No</p>
            <h1 className="text-2xl font-semibold tracking-tight">{order.order_no}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Buyer: <span className="font-medium text-foreground">{order.organization?.name ?? "-"}</span>
            </p>
          </div>
          <StatusBadge status={order.status as OrderStatus} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Buyer Organization</p>
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
        </div>
      </CardContent>
    </Card>
  );
}
