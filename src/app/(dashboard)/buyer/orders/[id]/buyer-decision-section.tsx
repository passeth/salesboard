"use client";

import { submitBuyerDecision } from "@/app/(dashboard)/buyer/_actions/decision-actions";
import { BoxQuantityDisplay } from "@/components/box-quantity-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderItemWithProduct, OrderStatus } from "@/types";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type BuyerDecisionSectionProps = {
  orderId: string;
  orderStatus: OrderStatus | string;
  items: OrderItemWithProduct[];
};

export function BuyerDecisionSection({
  orderId,
  orderStatus,
  items,
}: BuyerDecisionSectionProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const itemsNeedingDecision = useMemo(
    () => items.filter((item) => item.status === "under_review" || item.status === "partial"),
    [items],
  );

  if (orderStatus !== "needs_buyer_decision" || itemsNeedingDecision.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="size-5" />
          Action Required: Your Decision Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsNeedingDecision.length > 1 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  for (const item of itemsNeedingDecision) {
                    await submitBuyerDecision(orderId, item.id, "reject", notes[item.id]);
                  }
                });
              }}
            >
              Reject All ({itemsNeedingDecision.length})
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  for (const item of itemsNeedingDecision) {
                    await submitBuyerDecision(orderId, item.id, "accept", notes[item.id]);
                  }
                });
              }}
            >
              Accept All ({itemsNeedingDecision.length})
            </Button>
          </div>
        ) : null}

        {itemsNeedingDecision.map((item) => (
          <div key={item.id} className="space-y-3 rounded-md border border-amber-300 bg-white p-4">
            <div>
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">{item.product.sku}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Requested:</span>
              <BoxQuantityDisplay boxes={item.requested_qty} unitsPerCase={item.units_per_case} />
              <span>Proposed:</span>
              <BoxQuantityDisplay
                boxes={item.sales_confirmed_qty ?? item.vendor_confirmed_qty ?? item.requested_qty}
                unitsPerCase={item.units_per_case}
              />
            </div>

            <Input
              placeholder="Optional note"
              value={notes[item.id] ?? ""}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [item.id]: event.target.value }))
              }
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await submitBuyerDecision(orderId, item.id, "reject", notes[item.id]);
                  });
                }}
              >
                Reject
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await submitBuyerDecision(orderId, item.id, "accept", notes[item.id]);
                  });
                }}
              >
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
