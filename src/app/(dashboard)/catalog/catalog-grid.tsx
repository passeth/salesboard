"use client";

import { EmptyState } from "@/components/empty-state";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CatalogProduct, ViewMode } from "@/types";
import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toggleProductStatus } from "./_actions/product-actions";
import { ProductCard } from "./product-card";

interface CatalogGridProps {
  products: CatalogProduct[];
  view: ViewMode;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

function StatusToggle({ productId, status }: { productId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const isActive = status === "active";

  const handleToggle = () => {
    startTransition(async () => {
      await toggleProductStatus(productId, isActive ? "inactive" : "active");
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
        isPending
          ? "opacity-50 cursor-wait"
          : isActive
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isPending ? "..." : isActive ? "Active" : "Inactive"}
    </button>
  );
}

export function CatalogGrid({
  products,
  view,
  totalCount,
  currentPage,
  pageSize,
}: CatalogGridProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        description="Try adjusting your filters or search query to find what you're looking for."
      />
    );
  }

  return (
    <div className="space-y-6">
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} view="grid" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]" />
                <TableHead>Product</TableHead>
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead className="w-[120px]">Brand</TableHead>
                <TableHead className="w-[100px] text-right">Units/Case</TableHead>
                <TableHead className="w-[140px]">Barcode</TableHead>
                <TableHead className="w-[80px] text-right">CBM</TableHead>
                <TableHead className="w-[100px]">Volume</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const volume =
                  product.volume_value && product.volume_unit
                    ? `${product.volume_value}${product.volume_unit}`
                    : null;

                return (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="p-2">
                      <Link href={`/catalog/${product.id}`} className="block">
                        <div className="size-9 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="size-full object-cover"
                            />
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
                    <TableCell className="text-sm">
                      {product.brand ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {product.units_per_case ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {product.barcode ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {product.cbm != null ? product.cbm.toFixed(4) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {volume ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusToggle productId={product.id} status={product.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
        </span>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={currentPage > 1 ? createPageUrl(currentPage - 1) : "#"}
                  aria-disabled={currentPage <= 1}
                  className={
                    currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={
                    currentPage < totalPages ? createPageUrl(currentPage + 1) : "#"
                  }
                  aria-disabled={currentPage >= totalPages}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
