"use client";

import { setCartItemQty } from "@/app/(dashboard)/buyer/_actions/cart-actions";
import { submitDraft } from "@/app/(dashboard)/buyer/_actions/order-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BuyerCatalogProduct } from "@/types";
import { cn } from "@/lib/utils";
import { ProductDetailModal } from "./product-detail-modal";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ChevronsUpDown,
  Check,
  Globe,
  Loader2,
  PackageSearch,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

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

const TAB_LABELS: Record<string, { trading: string; pb: string; available_tab: string }> = {
  en: { trading: "Trading Products", pb: "Private Label", available_tab: "Untraded" },
  zh: { trading: "交易产品", pb: "自有品牌", available_tab: "未交易" },
  ru: { trading: "Торговые товары", pb: "Собственная марка", available_tab: "Без сделок" },
  vi: { trading: "Sản phẩm giao dịch", pb: "Nhãn riêng", available_tab: "Chưa giao dịch" },
  ja: { trading: "取引製品", pb: "自社PB", available_tab: "未取引" },
  my: { trading: "ကုန်သွယ်ကုန်ပစ္စည်း", pb: "ကိုယ်ပိုင်တံဆိပ်", available_tab: "မရောင်းရသေး" },
};

interface BuyerProductsGridProps {
  products: BuyerCatalogProduct[];
  brands: string[];
  categories: string[];
  orgId: string;
  locale: "en" | "zh" | "ru" | "vi" | "ja" | "my";
  translations: Record<string, string>;
  currencyCode: string;
  draftOrderId?: string | null;
}

type SortColumn = "name" | "brand" | "price" | "shipped" | "qty";
type SortDirection = "asc" | "desc";

function formatCurrency(value: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function BuyerProductsGrid({
  products,
  brands,
  categories,
  orgId,
  locale,
  translations,
  currencyCode,
  draftOrderId,
}: BuyerProductsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "";
  const [currentCategory, setCurrentCategory] = useState(searchParams.get("category") ?? "");

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"trading" | "pb" | "available_tab">("trading");
  const [sortColumn, setSortColumn] = useState<SortColumn>("shipped");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isCartMode, setIsCartMode] = useState(false);
  const [localQty, setLocalQty] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.cart_qty > 0) map.set(p.id, p.cart_qty);
    }
    return map;
  });
  const [inputValues, setInputValues] = useState<Map<string, string>>(
    new Map(),
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [modalProduct, setModalProduct] = useState<BuyerCatalogProduct | null>(null);

  const serverQtyRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.cart_qty > 0) map.set(p.id, p.cart_qty);
    }
    serverQtyRef.current = map;
  }, [products]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const getEffectiveQty = useCallback(
    (productId: string): number => {
      return localQty.get(productId) ?? 0;
    },
    [localQty],
  );

  const getInputDisplay = useCallback(
    (product: BuyerCatalogProduct): string => {
      if (inputValues.has(product.id)) return inputValues.get(product.id)!;
      const qty = getEffectiveQty(product.id);
      return qty > 0 ? String(qty) : "";
    },
    [inputValues, getEffectiveQty],
  );

  const hasUnsavedChange = useCallback(
    (product: BuyerCatalogProduct): boolean => {
      const raw = inputValues.get(product.id);
      if (raw === undefined) return false;
      const parsed = parseInt(raw) || 0;
      const current = getEffectiveQty(product.id);
      return parsed !== current;
    },
    [inputValues, getEffectiveQty],
  );

  const handleBrandChange = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brand && brand !== "all") {
      params.set("brand", brand);
    } else {
      params.delete("brand");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category === "all" ? "" : category);
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

  const tabCounts = useMemo(() => {
    const counts = { trading: 0, pb: 0, available_tab: 0 };
    for (const p of products) {
      if (p.supply_type === "trading") counts.trading++;
      else if (p.supply_type === "pb") counts.pb++;
      else if (p.supply_type === null) counts.available_tab++;
    }
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) =>
      activeTab === "available_tab" ? p.supply_type === null : p.supply_type === activeTab,
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
        case "name": {
          const aName = translations[a.id] || a.name;
          const bName = translations[b.id] || b.name;
          cmp = aName.localeCompare(bName);
          break;
        }
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
          cmp = getEffectiveQty(a.id) - getEffectiveQty(b.id);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredProducts, sortColumn, sortDirection, getEffectiveQty, translations]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortArrow = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
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

  const handleSaveQty = async (product: BuyerCatalogProduct) => {
    const raw = inputValues.get(product.id);
    const newQty = raw !== undefined ? parseInt(raw) || 0 : getEffectiveQty(product.id);

    setLocalQty((prev) => {
      const next = new Map(prev);
      if (newQty > 0) {
        next.set(product.id, newQty);
      } else {
        next.delete(product.id);
      }
      return next;
    });
    setInputValues((prev) => {
      const next = new Map(prev);
      next.delete(product.id);
      return next;
    });

    setSavingIds((prev) => new Set(prev).add(product.id));

    try {
      await setCartItemQty(
        orgId,
        product.id,
        newQty,
        product.units_per_case ?? null,
        product.last_unit_price ?? null,
      );

      setSavedIds((prev) => new Set(prev).add(product.id));
      setTimeout(() => {
        setSavedIds((prev) => {
          const s = new Set(prev);
          s.delete(product.id);
          return s;
        });
      }, 1500);
    } catch {
      setLocalQty((prev) => {
        const next = new Map(prev);
        const serverVal = serverQtyRef.current.get(product.id) ?? 0;
        if (serverVal > 0) {
          next.set(product.id, serverVal);
        } else {
          next.delete(product.id);
        }
        return next;
      });
    } finally {
      setSavingIds((prev) => {
        const s = new Set(prev);
        s.delete(product.id);
        return s;
      });
    }
  };

  const handleRequestPrice = () => {
    const count = selectedIds.size;
    alert(
      `Price request sent for ${count} product${count > 1 ? "s" : ""}`,
    );
    setSelectedIds(new Set());
  };

  const getDisplayName = (product: BuyerCatalogProduct) => {
    if (locale === "en") return product.name;
    const translated = translations[product.id];
    if (translated) return translated;
    return null;
  };

  const totalCartItems = useMemo(() => {
    let count = 0;
    for (const qty of localQty.values()) {
      if (qty > 0) count++;
    }
    return count;
  }, [localQty]);

  const cartSummary = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;
    let totalUnits = 0;
    let totalCartons = 0;
    let totalCbm = 0;
    for (const [pid, qty] of localQty) {
      if (qty <= 0) continue;
      const p = productMap.get(pid);
      if (!p) continue;
      totalUnits += qty;
      const upc = p.units_per_case ?? 1;
      const cartons = Math.ceil(qty / upc);
      totalCartons += cartons;
      if (p.last_unit_price != null) totalAmount += qty * p.last_unit_price;
      if (p.cbm != null) totalCbm += cartons * p.cbm;
    }
    return { totalAmount, totalUnits, totalCartons, totalCbm };
  }, [products, localQty]);

  const toggleCartMode = () => {
    setIsCartMode((prev) => !prev);
    setInputValues(new Map());
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
    <div className="space-y-4">
      {(totalCartItems > 0 || isCartMode) && (
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-5 text-base">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="font-medium">{totalCartItems} items</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(cartSummary.totalAmount, currencyCode)}
                  </span>{" "}
                  total
                </span>
                <span>
                  <span className="font-medium text-foreground">{cartSummary.totalCartons.toLocaleString()}</span> cartons
                </span>
                <span>
                  <span className="font-medium text-foreground">{cartSummary.totalUnits.toLocaleString()}</span> units
                </span>
                <span>
                  <span className="font-medium text-foreground">{cartSummary.totalCbm.toFixed(2)}</span> CBM
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCartMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCartMode}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Exit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</span>
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
          <span className="shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</span>
          <button
            onClick={() => handleCategoryChange("all")}
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
              onClick={() => handleCategoryChange(cat)}
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
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-[100px]">
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

          <Button
            variant={isCartMode ? "default" : "outline"}
            onClick={toggleCartMode}
            className={cn(
              "gap-2",
              isCartMode &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {isCartMode ? "Exit Cart Mode" : totalCartItems > 0 ? (
              <>
                Continue Order
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                  {totalCartItems}
                </span>
              </>
            ) : "Create Order"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => { if (isCartMode) toggleCartMode(); }}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Save Draft
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save current selections without submitting</p>
              </TooltipContent>
            </Tooltip>
            {draftOrderId && totalCartItems > 0 ? (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button disabled={isSubmitting} className="gap-1.5">
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        {isSubmitting ? "Submitting..." : "Submit Order"}
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Submit your order for processing</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit this order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to submit an order with {totalCartItems} item(s).
                      Once submitted, it will be sent for review.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        startSubmitTransition(async () => {
                          await submitDraft(draftOrderId);
                        });
                      }}
                    >
                      Confirm & Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild className="gap-1.5">
                    <Link href="/buyer/order/new">
                      Submit Order
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Review and submit your order</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "trading" | "pb" | "available_tab")}>
        <TabsList>
          <TabsTrigger value="trading">
            {(TAB_LABELS[locale] ?? TAB_LABELS.en).trading} ({tabCounts.trading})
          </TabsTrigger>
          <TabsTrigger value="pb">
            {(TAB_LABELS[locale] ?? TAB_LABELS.en).pb} ({tabCounts.pb})
          </TabsTrigger>
          <TabsTrigger value="available_tab">
            {(TAB_LABELS[locale] ?? TAB_LABELS.en).available_tab} ({tabCounts.available_tab})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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

      {isCartMode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span>
            Cart mode active — enter quantities and click{" "}
            <Check className="inline h-3.5 w-3.5" /> to add to cart
          </span>
        </div>
      )}

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
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[400px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      Product
                      <SortArrow column="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("brand")}
                    >
                      Brand
                      <SortArrow column="brand" />
                    </button>
                  </TableHead>
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
                  <TableHead className="w-[80px] text-right">Packing</TableHead>
                  <TableHead className="w-[120px] text-right">
                    <button
                      className="flex items-center ml-auto hover:text-foreground transition-colors"
                      onClick={() => handleSort("qty")}
                    >
                      Qty (CTN)
                      <SortArrow column="qty" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">Total Pcs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => {
                  const isUntraded = !product.has_trade_history;
                  const isSelected = selectedIds.has(product.id);
                  const displayName = getDisplayName(product);
                  const effectiveQty = getEffectiveQty(product.id);
                  const isSaving = savingIds.has(product.id);
                  const isSaved = savedIds.has(product.id);
                  const showSaveBtn =
                    isCartMode && hasUnsavedChange(product) && !isSaving;

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "hover:bg-muted/50",
                        isSelected && "bg-muted/30",
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
                        <button type="button" onClick={() => setModalProduct(product)} className="block">
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
                        </button>
                      </TableCell>

                      <TableCell className="max-w-[400px]">
                        <button
                          type="button"
                          onClick={() => setModalProduct(product)}
                          className="block text-left hover:text-primary transition-colors w-full"
                        >
                          <div className="text-sm font-medium truncate" title={displayName ?? product.name}>
                            {displayName ?? product.name}
                          </div>
                          <div
                            className={cn(
                              "text-xs truncate",
                              locale !== "en" && !displayName
                                ? "text-amber-500 italic"
                                : "text-muted-foreground",
                            )}
                          >
                            {locale === "en"
                              ? product.sku
                              : displayName
                                ? product.name
                                : NO_TRANSLATION_MSG[locale]}
                          </div>
                        </button>
                      </TableCell>

                      <TableCell className="text-sm">
                        {product.brand ?? "—"}
                      </TableCell>

                      <TableCell className="text-sm text-right tabular-nums">
                        {product.last_unit_price != null ? (
                          formatCurrency(product.last_unit_price, currencyCode)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(
                          "text-sm text-right tabular-nums",
                          product.shipped_qty_3m > 0 && "font-semibold",
                        )}
                      >
                        {product.shipped_qty_3m.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-sm text-right tabular-nums">
                        {product.units_per_case ?? "—"}
                      </TableCell>

                      <TableCell className="p-2">
                        {isCartMode ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={getInputDisplay(product)}
                              onChange={(e) => {
                                setInputValues((prev) => {
                                  const next = new Map(prev);
                                  next.set(product.id, e.target.value);
                                  return next;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && hasUnsavedChange(product)) {
                                  handleSaveQty(product);
                                }
                                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                  e.preventDefault();
                                  if (hasUnsavedChange(product)) {
                                    handleSaveQty(product);
                                  }
                                  const inputs = Array.from(
                                    document.querySelectorAll<HTMLInputElement>("[data-qty-input]"),
                                  );
                                  const idx = inputs.indexOf(e.currentTarget as HTMLInputElement);
                                  const next = inputs[e.key === "ArrowDown" ? idx + 1 : idx - 1];
                                  if (next) { next.focus(); next.select(); }
                                }
                              }}
                              data-qty-input
                              className={cn(
                                "w-[70px] h-8 text-right tabular-nums",
                                effectiveQty > 0 &&
                                  !inputValues.has(product.id) &&
                                  "border-primary/50 bg-primary/5",
                              )}
                              disabled={isSaving}
                              placeholder="0"
                            />

                            {isSaving ? (
                              <div className="flex size-8 items-center justify-center">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : isSaved ? (
                              <div className="flex size-8 items-center justify-center">
                                <Check className="size-4 text-green-500" />
                              </div>
                            ) : showSaveBtn ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary hover:bg-primary/10"
                                onClick={() => handleSaveQty(product)}
                              >
                                <Check className="size-4" />
                              </Button>
                            ) : (
                              <div className="size-8" />
                            )}
                          </div>
                        ) : (
                          <div className="text-right tabular-nums text-sm">
                            {effectiveQty > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                <ShoppingCart className="size-3" />
                                {effectiveQty}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-right tabular-nums">
                        {(() => {
                          const qty = effectiveQty;
                          const upc = product.units_per_case;
                          if (qty > 0 && upc) {
                            return (
                              <span className="font-medium">{(qty * upc).toLocaleString()}</span>
                            );
                          }
                          return <span className="text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <span className="text-sm text-muted-foreground">
            Showing {sortedProducts.length} of {tabCounts[activeTab]} products
          </span>
        </>
      )}

      <ProductDetailModal
        product={modalProduct}
        orgId={orgId}
        open={modalProduct !== null}
        onOpenChange={(open) => { if (!open) setModalProduct(null); }}
        locale={locale}
        translatedName={modalProduct ? translations[modalProduct.id] : null}
      />
    </div>
  );
}
