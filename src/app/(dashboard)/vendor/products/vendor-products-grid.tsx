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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  VendorCommissionInfo,
  VendorProductItem,
} from "@/lib/queries/vendor";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  PackageSearch,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface VendorProductsGridProps {
  products: VendorProductItem[];
  commissions: VendorCommissionInfo[];
  brands: string[];
  categories: string[];
}

type SortColumn = "name" | "brand" | "sku" | "buyers";
type SortDirection = "asc" | "desc";

export function VendorProductsGrid({
  products,
  commissions,
  brands,
  categories,
}: VendorProductsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "";

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  const [activeTab, setActiveTab] = useState<"managing" | "available">(
    "managing",
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(timer);
  });

  const tabCounts = useMemo(() => {
    let managing = 0;
    let available = 0;
    for (const p of products) {
      if (p.is_managed) managing++;
      else available++;
    }
    return { managing, available };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) =>
      activeTab === "managing" ? p.is_managed : !p.is_managed,
    );
    if (currentBrand) {
      filtered = filtered.filter((p) => p.brand === currentBrand);
    }
    if (currentCategory) {
      filtered = filtered.filter((p) => p.category === currentCategory);
    }
    if (!debouncedSearch) return filtered;
    const search = debouncedSearch.toLowerCase();
    return filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search)),
    );
  }, [products, activeTab, currentBrand, currentCategory, debouncedSearch]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "brand":
          cmp = (a.brand ?? "").localeCompare(b.brand ?? "");
          break;
        case "sku":
          cmp = a.sku.localeCompare(b.sku);
          break;
        case "buyers":
          cmp = a.buyer_count - b.buyer_count;
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleBrandChange = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brand && brand !== "all") {
      params.set("brand", brand);
    } else {
      params.delete("brand");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const SortArrow = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column)
      return (
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
      );
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products available"
        description="Select a vendor organization to view products."
      />
    );
  }

  return (
    <div className="space-y-4">
      {commissions.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-medium mb-2">
            Commission Rates by Buyer
          </h3>
          <div className="flex flex-wrap gap-3">
            {commissions.map((c) => (
              <div
                key={c.buyer_org_id}
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <span className="text-muted-foreground">{c.buyer_name}</span>
                <span className="font-medium">
                  {c.commission_type === "rate"
                    ? `${(c.commission_value * 100).toFixed(1)}%`
                    : `$${c.commission_value.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Brand
          </span>
          <button
            onClick={() => handleBrandChange("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
              !currentBrand
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            )}
          >
            All
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => handleBrandChange(brand)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
                currentBrand === brand
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted",
              )}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category
          </span>
          <button
            onClick={() => setCurrentCategory("")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
              !currentCategory
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCurrentCategory(cat)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
                currentCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, SKU, or barcode..."
            className="pl-9"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setTimeout(
                () => setDebouncedSearch(e.target.value),
                300,
              );
            }}
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "managing" | "available")}
      >
        <TabsList>
          <TabsTrigger value="managing">
            Managing ({tabCounts.managing})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({tabCounts.available})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sortedProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No products match your filters
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[350px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      Product
                      <SortArrow column="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("sku")}
                    >
                      SKU
                      <SortArrow column="sku" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("brand")}
                    >
                      Brand
                      <SortArrow column="brand" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    Units/Case
                  </TableHead>
                  {activeTab === "managing" && (
                    <>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="flex items-center hover:text-foreground transition-colors"
                          onClick={() => handleSort("buyers")}
                        >
                          Buyers
                          <SortArrow column="buyers" />
                        </button>
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="p-2">
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
                    </TableCell>

                    <TableCell className="max-w-[350px]">
                      <div
                        className="text-sm font-medium truncate"
                        title={product.name}
                      >
                        {product.name}
                      </div>
                      {product.barcode && (
                        <div className="text-xs text-muted-foreground truncate">
                          {product.barcode}
                        </div>
                      )}
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

                    {activeTab === "managing" && (
                      <>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              product.supply_type === "trading"
                                ? "bg-blue-100 text-blue-700"
                                : product.supply_type === "pb"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {product.supply_type === "trading"
                              ? "Trading"
                              : product.supply_type === "pb"
                                ? "Private Label"
                                : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">
                              {product.buyer_count}
                            </span>
                            {product.buyer_names.length > 0 && (
                              <span
                                className="ml-1.5 text-xs text-muted-foreground truncate"
                                title={product.buyer_names.join(", ")}
                              >
                                ({product.buyer_names.slice(0, 2).join(", ")}
                                {product.buyer_names.length > 2 &&
                                  ` +${product.buyer_names.length - 2}`}
                                )
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <span className="text-sm text-muted-foreground">
            Showing {sortedProducts.length} of {tabCounts[activeTab]} products
          </span>
        </>
      )}
    </div>
  );
}
