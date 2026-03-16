"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogProduct, ViewMode } from "@/types";
import { PackageSearch } from "lucide-react";
import Link from "next/link";

interface ProductCardProps {
  product: CatalogProduct;
  view: ViewMode;
}

export function ProductCard({ product, view }: ProductCardProps) {
  const volume =
    product.volume_value && product.volume_unit
      ? `${product.volume_value} ${product.volume_unit}`
      : null;

  if (view === "list") {
    return (
      <Link href={`/catalog/${product.id}`} className="block group">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="shrink-0 size-12 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                />
              ) : (
                <PackageSearch className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div className="sm:col-span-2">
                <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  SKU: {product.sku}
                </p>
              </div>
              <div>
                {product.brand && (
                  <Badge variant="secondary" className="truncate max-w-full">
                    {product.brand}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground text-right">
                {volume}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/catalog/${product.id}`} className="block group h-full">
      <Card className="h-full flex flex-col transition-shadow hover:shadow-md overflow-hidden">
        <div className="aspect-square w-full bg-muted flex items-center justify-center overflow-hidden border-b border-border">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <PackageSearch className="size-12 text-muted-foreground" />
          )}
        </div>
        <CardContent className="p-4 flex flex-col flex-1 gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </div>
          <div className="mt-auto space-y-2 pt-2">
            <p className="text-xs text-muted-foreground truncate">
              SKU: {product.sku}
            </p>
            <div className="flex items-center justify-between gap-2">
              {product.brand ? (
                <Badge variant="secondary" className="truncate max-w-[120px]">
                  {product.brand}
                </Badge>
              ) : (
                <span />
              )}
              {volume && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {volume}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
