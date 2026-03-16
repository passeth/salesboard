"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddToCartButton({
  productId,
  productName,
  unitsPerCase,
}: {
  productId: string;
  productName: string;
  unitsPerCase: number | null;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4">
      {unitsPerCase != null ? (
        <span className="text-sm text-muted-foreground">
          1 box = {unitsPerCase} pcs
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-amber-600">
          <AlertTriangle className="size-4" />
          Units per case not set
        </span>
      )}
      <Button
        onClick={() =>
          router.push(
            `/buyer/order/new?product=${productId}`
          )
        }
      >
        <ShoppingCart className="mr-2 size-4" />
        Add to Order
      </Button>
    </div>
  );
}
