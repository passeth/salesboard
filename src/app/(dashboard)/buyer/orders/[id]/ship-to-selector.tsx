"use client";

import { updateOrderShipTo } from "@/app/(dashboard)/buyer/_actions/order-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizationRow } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type ShipToSelectorProps = {
  orderId: string;
  currentShipToId: string | null;
  shipToOrgs: Pick<OrganizationRow, "id" | "name" | "code">[];
};

export function ShipToSelector({ orderId, currentShipToId, shipToOrgs }: ShipToSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newShipToId: string) => {
    if (newShipToId === currentShipToId) return;

    startTransition(async () => {
      await updateOrderShipTo(orderId, newShipToId);
      router.refresh();
    });
  };

  return (
    <Select value={currentShipToId ?? undefined} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-auto w-full border-none bg-transparent p-0 text-left font-medium shadow-none hover:bg-muted/50 focus:ring-0 [&>svg]:size-3.5 [&>svg]:text-muted-foreground">
        <SelectValue placeholder="Select ship-to" />
      </SelectTrigger>
      <SelectContent>
        {shipToOrgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name} {org.code ? `(${org.code})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
