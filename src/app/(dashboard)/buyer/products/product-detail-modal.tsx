"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { BuyerCatalogProduct } from "@/types";
import {
  getProductOrderHistory,
  type ProductOrderHistoryItem,
} from "@/app/(dashboard)/buyer/_actions/order-actions";
import { History, Loader2, PackageSearch, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ProductDetailModalProps {
  product: BuyerCatalogProduct | null;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  translatedName?: string | null;
}

export function ProductDetailModal({
  product,
  orgId,
  open,
  onOpenChange,
  locale,
  translatedName,
}: ProductDetailModalProps) {
  const [history, setHistory] = useState<ProductOrderHistoryItem[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async (pid: string) => {
    setLoadingHistory(true);
    try {
      const data = await getProductOrderHistory(orgId, pid);
      setHistory(data);
    } finally {
      setLoadingHistory(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (open && product) {
      setHistory(null);
      loadHistory(product.id);
    }
  }, [open, product, loadHistory]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setHistory(null);
      setLoadingHistory(false);
    }
    onOpenChange(nextOpen);
  };

  if (!product) return null;

  const displayName = locale !== "en" && translatedName ? translatedName : product.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg leading-tight">{displayName}</DialogTitle>
          {locale !== "en" && translatedName && (
            <p className="text-sm text-muted-foreground">{product.name}</p>
          )}
        </DialogHeader>

        <div className="flex gap-4">
          <Link href={`/catalog/${product.id}`} className="size-24 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden border hover:ring-2 hover:ring-primary transition-shadow">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="size-full object-cover"
              />
            ) : (
              <PackageSearch className="size-8 text-muted-foreground" />
            )}
          </Link>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">{product.sku}</span>
              {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
              {product.supply_type && (
                <Badge variant={product.supply_type === "trading" ? "default" : "outline"}>
                  {product.supply_type === "trading" ? "Trading" : product.supply_type === "pb" ? "PB" : "Available"}
                </Badge>
              )}
            </div>
            {product.barcode && (
              <span className="text-xs text-muted-foreground">{product.barcode}</span>
            )}
            {product.category && (
              <span className="text-sm text-muted-foreground">{product.category}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
          <InfoItem label="Volume" value={
            product.volume_value && product.volume_unit
              ? `${product.volume_value} ${product.volume_unit}`
              : "—"
          } />
          <InfoItem label="Units/Case" value={product.units_per_case?.toString() ?? "—"} />
          <InfoItem label="CBM" value={product.cbm?.toFixed(4) ?? "—"} />
          <InfoItem label="Gross Weight" value={
            product.gross_weight ? `${product.gross_weight} kg` : "—"
          } />
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border p-3">
          <InfoItem
            label="Supply Price"
            value={product.last_unit_price != null ? `$${product.last_unit_price.toFixed(2)}` : "—"}
            highlight
          />
          <InfoItem
            label="3M Shipped"
            value={product.shipped_qty_3m.toLocaleString()}
            highlight={product.shipped_qty_3m > 0}
          />
          <InfoItem
            label="In Cart"
            value={product.cart_qty > 0 ? product.cart_qty.toLocaleString() : "—"}
            icon={product.cart_qty > 0 ? <ShoppingCart className="size-3 text-primary" /> : undefined}
          />
        </div>

        {history === null || loadingHistory ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading purchase history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-3 text-sm text-muted-foreground">
            No purchase history for this product
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <History className="size-4" />
              Purchase History ({history.length})
            </h4>
            <div className="rounded-lg border divide-y max-h-[200px] overflow-y-auto">
              {history.map((h) => (
                <div key={`${h.order_id}`} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{h.order_no}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.ordered_at ? new Date(h.ordered_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col">
                      <span className="tabular-nums">
                        {(h.final_qty ?? h.requested_qty).toLocaleString()} ea
                      </span>
                      {h.unit_price != null && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ${h.unit_price.toFixed(2)}/ea
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {h.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? "font-semibold" : ""} flex items-center gap-1`}>
        {icon}
        {value}
      </span>
    </div>
  );
}
