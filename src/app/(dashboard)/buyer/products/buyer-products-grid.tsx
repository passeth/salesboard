"use client";

import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BuyerProduct } from "@/types";
import { PackageSearch, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface BuyerProductsGridProps {
  products: BuyerProduct[];
}

export function BuyerProductsGrid({ products }: BuyerProductsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateSearch(searchValue);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateSearch]);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ko-KR");
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products..."
          className="pl-9"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No ordered products"
          description="Once you place orders, your products will appear here with order statistics."
          action={{ label: "Browse Catalog", href: "/catalog" }}
        />
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[52px]" />
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[120px]">Brand</TableHead>
                  <TableHead className="w-[100px] text-right">Units/Case</TableHead>
                  <TableHead className="w-[120px] text-right">Total Ordered</TableHead>
                  <TableHead className="w-[120px] text-right">Last Order Qty</TableHead>
                  <TableHead className="w-[120px]">Last Ordered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="p-2">
                      <Link href={`/catalog/${product.id}`} className="block">
                        <div className="size-9 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="size-full object-cover" />
                          ) : (
                            <PackageSearch className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/catalog/${product.id}`} className="block hover:text-primary transition-colors">
                        <span className="text-sm font-medium line-clamp-1">{product.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {product.sku}
                    </TableCell>
                    <TableCell className="text-sm">{product.brand ?? "—"}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {product.units_per_case ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">
                      {product.total_requested_qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {product.last_order_qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(product.last_order_date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <span className="text-sm text-muted-foreground">Showing {products.length} products</span>
        </>
      )}
    </div>
  );
}
