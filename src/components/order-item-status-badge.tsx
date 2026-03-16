import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrderItemStatus } from "@/types";

const ORDER_ITEM_STATUS_CONFIG: Record<OrderItemStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  under_review: { label: "Under Review", className: "bg-status-sales-review/10 text-status-sales-review" },
  confirmed: { label: "Confirmed", className: "bg-status-confirmed/10 text-status-confirmed" },
  partial: { label: "Partial", className: "bg-status-needs-decision/10 text-status-needs-decision" },
  rejected: { label: "Rejected", className: "bg-status-rejected/10 text-status-rejected" },
  cancelled: { label: "Cancelled", className: "bg-status-cancelled/10 text-status-cancelled" },
};

type OrderItemStatusBadgeProps = {
  status: OrderItemStatus;
};

export function OrderItemStatusBadge({ status }: OrderItemStatusBadgeProps) {
  const config = ORDER_ITEM_STATUS_CONFIG[status];

  return (
    <Badge className={cn("border-transparent", config.className)}>
      {config.label}
    </Badge>
  );
}
