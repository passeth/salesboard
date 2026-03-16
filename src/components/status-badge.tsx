import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, OrderStatus } from "@/types";

const ORDER_STATUS_COLOR_CLASS: Record<string, string> = {
  "status-draft": "bg-status-draft/10 text-status-draft",
  "status-submitted": "bg-status-submitted/10 text-status-submitted",
  "status-vendor-review": "bg-status-vendor-review/10 text-status-vendor-review",
  "status-sales-review": "bg-status-sales-review/10 text-status-sales-review",
  "status-needs-decision": "bg-status-needs-decision/10 text-status-needs-decision",
  "status-confirmed": "bg-status-confirmed/10 text-status-confirmed",
  "status-rejected": "bg-status-rejected/10 text-status-rejected",
  "status-invoiced": "bg-status-invoiced/10 text-status-invoiced",
  "status-partially-shipped": "bg-status-partially-shipped/10 text-status-partially-shipped",
  "status-shipped": "bg-status-shipped/10 text-status-shipped",
  "status-completed": "bg-status-completed/10 text-status-completed",
  "status-cancelled": "bg-status-cancelled/10 text-status-cancelled",
};

type StatusBadgeProps = {
  status: OrderStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];
  const colorClass = ORDER_STATUS_COLOR_CLASS[config.colorToken] ?? "bg-muted text-muted-foreground";

  return (
    <Badge className={cn("border-transparent", colorClass)}>
      {config.label}
    </Badge>
  );
}
