"use client";

import { updateCartItemQty, removeCartItem } from "@/app/(dashboard)/buyer/_actions/cart-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { BuyerDraftOrder } from "@/types";
import { X } from "lucide-react";
import { useState, useTransition } from "react";

type LineItemRowProps = {
  orderId: string;
  item: BuyerDraftOrder["items"][number];
};

export function LineItemRow({ orderId, item }: LineItemRowProps) {
  const [qty, setQty] = useState(item.requested_qty.toString());
  const [isPending, startTransition] = useTransition();

  const handleBlur = () => {
    const newQty = parseInt(qty, 10);

    if (isNaN(newQty) || newQty <= 0) {
      startTransition(async () => {
        await removeCartItem(orderId, item.product_id);
      });
      return;
    }

    if (newQty !== item.requested_qty) {
      startTransition(async () => {
        await updateCartItemQty(orderId, item.product_id, newQty);
      });
    }
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeCartItem(orderId, item.product_id);
    });
  };

  const currentQty = parseInt(qty, 10) || 0;
  const pcs = currentQty * (item.units_per_case ?? 0);
  const weight = currentQty * (item.gross_weight ?? 0);
  const amount = currentQty * (item.unit_price ?? 0);

  return (
    <TableRow>
      <TableCell>
        <div className="size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product_name}
              className="size-full object-cover"
            />
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        <p className="line-clamp-1 font-medium">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">{item.product_sku}</p>
      </TableCell>

      <TableCell>
        {item.unit_price !== null ? (
          `$${item.unit_price.toFixed(2)}`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        <Input
          type="number"
          min={1}
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={handleBlur}
          disabled={isPending}
          className="w-20"
        />
      </TableCell>

      <TableCell>
        {item.units_per_case !== null ? (
          pcs.toLocaleString()
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        {item.gross_weight !== null ? (
          `${weight.toFixed(1)} kg`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        {item.unit_price !== null ? (
          `$${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isPending}
        >
          <X className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
