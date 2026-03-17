"use client";

import { setCartItemQty } from "@/app/(dashboard)/buyer/_actions/cart-actions";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BuyerCatalogProduct } from "@/types";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Globe,
  PackageSearch,
  Search,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
  ru: "Русский",
  vi: "Tiếng Việt",
  ja: "日本語",
  my: "မြန်မာ",
};

const NO_TRANSLATION_MSG: Record<string, string> = {
  en: "",
  zh: "暂无翻译",
  ru: "Перевод недоступен",
  vi: "Chưa có bản dịch",
  ja: "翻訳がありません",
  my: "ဘာသာပြန်မရှိပါ",
};

interface BuyerProductsGridProps {
  products: BuyerCatalogProduct[];
  brands: string[];
  orgId: string;
  locale: "en" | "zh" | "ru" | "vi" | "ja" | "my";
  translations: Record<string, string>;
}

type SortColumn = "name" | "brand" | "price" | "shipped" | "qty";
type SortDirection = "asc" | "desc";

export function BuyerProductsGrid({
  products,
  brands,
  orgId,
  locale,
  translations,
}: BuyerProductsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "";

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("shipped");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingQty, setEditingQty] = useState<Map<string, string>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleBrandChange = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brand && brand !== "all") {
      params.set("brand", brand);
    } else {
      params.delete("brand");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLocaleChange = (newLocale: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newLocale && newLocale !== "en") {
      params.set("lang", newLocale);
    } else {
      params.delete("lang");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return products;
    const search = debouncedSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search))
    );
  }, [products, debouncedSearch]);

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
        case "price":
          cmp = (a.last_unit_price ?? 0) - (b.last_unit_price ?? 0);
          break;
        case "shipped":
          cmp = a.shipped_qty_3m - b.shipped_qty_3m;
          break;
        case "qty":
          cmp = a.cart_qty - b.cart_qty;
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
      setSortDirection("desc");
    }
  };

  const SortArrow = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  const handleCheckbox = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleQtyBlur = (product: BuyerCatalogProduct) => {
    const rawValue = editingQty.get(product.id);
    const next = new Map(editingQty);
    next.delete(product.id);
    setEditingQty(next);

    const newQty =
      rawValue !== undefined
        ? parseInt(rawValue) || 0
        : product.cart_qty;
    if (newQty === product.cart_qty) return;

    setSavingIds((prev) => new Set(prev).add(product.id));

    startTransition(async () => {
      try {
        await setCartItemQty(
          orgId,
          product.id,
          newQty,
          product.units_per_case ?? null,
          product.last_unit_price ?? null
        );
        router.refresh();
      } catch {
        alert("Failed to update quantity. Please try again.");
      } finally {
        setSavingIds((prev) => {
          const s = new Set(prev);
          s.delete(product.id);
          return s;
        });
      }
    });
  };

  const handleRequestPrice = () => {
    const count = selectedIds.size;
    alert(
      `Price request sent for ${count} product${count > 1 ? "s" : ""}`
    );
    setSelectedIds(new Set());
  };

  const getDisplayName = (product: BuyerCatalogProduct) => {
    if (locale === "en") return product.name;
    const translated = translations[product.id];
    if (translated) return translated;
    return null;
  };

  const totalCartItems = products.filter((p) => p.cart_qty > 0).length;
  const showBottomBar = totalCartItems > 0;

  const formatVolume = (value: number | null, unit: string | null) => {
    if (!value && !unit) return "—";
    return `${value ?? ""}${unit ?? ""}`.trim() || "—";
  };

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products available"
        description="There are no active products in the catalog."
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, SKU, or barcode..."
            className="pl-9"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <Select
          value={currentBrand || "all"}
          onValueChange={handleBrandChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locale} onValueChange={handleLocaleChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCALE_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm">
            {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button onClick={handleRequestPrice} variant="secondary">
            Request Price for {selectedIds.size} item
            {selectedIds.size > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {sortedProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No products match your filters
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[40px]" />
                  <TableHead className="max-w-[280px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      Product
                      <SortArrow column="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("brand")}
                    >
                      Brand
                      <SortArrow column="brand" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px]">Volume</TableHead>
                  <TableHead className="w-[100px] text-right">
                    <button
                      className="flex items-center ml-auto hover:text-foreground transition-colors"
                      onClick={() => handleSort("price")}
                    >
                      Supply Price
                      <SortArrow column="price" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    <button
                      className="flex items-center ml-auto hover:text-foreground transition-colors"
                      onClick={() => handleSort("shipped")}
                    >
                      3M Shipped
                      <SortArrow column="shipped" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[90px] text-right">
                    <button
                      className="flex items-center ml-auto hover:text-foreground transition-colors"
                      onClick={() => handleSort("qty")}
                    >
                      Qty
                      <SortArrow column="qty" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => {
                  const isUntraded = !product.has_trade_history;
                  const isSelected = selectedIds.has(product.id);
                  const displayName = getDisplayName(product);

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "hover:bg-muted/50",
                        isSelected && "bg-muted/30"
                      )}
                    >
                      <TableCell className="p-2">
                        {isUntraded && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleCheckbox(product.id, checked as boolean)
                            }
                          />
                        )}
                      </TableCell>

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

                      <TableCell className="max-w-[280px]">
                        <Link
                          href={`/catalog/${product.id}`}
                          className="block hover:text-primary transition-colors"
                        >
                          <div className="text-sm font-medium line-clamp-1">
                            {displayName ?? product.name}
                          </div>
                          <div
                            className={cn(
                              "text-xs line-clamp-1",
                              locale !== "en" && !displayName
                                ? "text-amber-500 italic"
                                : "text-muted-foreground"
                            )}
                          >
                            {locale === "en"
                              ? product.sku
                              : displayName
                                ? product.name
                                : NO_TRANSLATION_MSG[locale]}
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="text-sm">
                        {product.brand ?? "—"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {formatVolume(product.volume_value, product.volume_unit)}
                      </TableCell>

                      <TableCell className="text-sm text-right tabular-nums">
                        {product.last_unit_price != null ? (
                          `$${product.last_unit_price.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(
                          "text-sm text-right tabular-nums",
                          product.shipped_qty_3m > 0 && "font-semibold"
                        )}
                      >
                        {product.shipped_qty_3m.toLocaleString()}
                      </TableCell>

                      <TableCell className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            editingQty.has(product.id)
                              ? editingQty.get(product.id)!
                              : product.cart_qty > 0
                                ? String(product.cart_qty)
                                : ""
                          }
                          onChange={(e) => {
                            const next = new Map(editingQty);
                            next.set(product.id, e.target.value);
                            setEditingQty(next);
                          }}
                          onBlur={() => handleQtyBlur(product)}
                          className={cn(
                            "w-20 h-8 text-right tabular-nums",
                            savingIds.has(product.id) && "opacity-50",
                            product.cart_qty > 0 &&
                              !editingQty.has(product.id) &&
                              "border-primary/50 bg-primary/5"
                          )}
                          disabled={savingIds.has(product.id)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <span className="text-sm text-muted-foreground">
            Showing {sortedProducts.length} of {products.length} products
          </span>
        </>
      )}

      {showBottomBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span>
                {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} in cart
              </span>
            </div>
            <Button variant="outline" asChild>
              <Link href="/buyer/order/new">
                Review Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
