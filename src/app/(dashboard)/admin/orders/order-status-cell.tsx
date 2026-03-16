"use client";

import { updateOrderStatus } from "@/app/(dashboard)/admin/_actions/order-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS_CONFIG, OrderStatus } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type OrderStatusCellProps = {
  orderId: string;
  currentStatus: OrderStatus;
};

const ALL_STATUSES = Object.values(OrderStatus);

export function OrderStatusCell({ orderId, currentStatus }: OrderStatusCellProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
      router.refresh();
    });
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className="h-7 w-[160px] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {ORDER_STATUS_CONFIG[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
