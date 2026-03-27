"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  setBuyerProductSupplyType,
  upsertBuyerProductPrice,
} from "@/app/(dashboard)/sales/_actions/accounts-actions";
import type { AccountPricingRow } from "@/types";
import {
  Check,
  EyeOff,
  Package,
  Pencil,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type AccountPricingTabProps = {
  pricing: AccountPricingRow[];
  buyerOrgId: string;
  currencyCode: string | null;
};

type SupplyFilter = "all" | "trading" | "pb" | "available" | "hidden";
type PriceFilter = "all" | "priced" | "unpriced";

const SUPPLY_TYPE_CONFIG = {
  trading: { label: "Trading", color: "bg-blue-50 text-blue-700" },
  pb: { label: "PB", color: "bg-purple-50 text-purple-700" },
  hidden: { label: "Hidden", color: "bg-gray-50 text-gray-500" },
} as const;

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function AccountPricingTab({
  pricing,
  buyerOrgId,
  currencyCode,
}: AccountPricingTabProps) {
  const [search, setSearch] = useState("");
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSettlement, setEditSettlement] = useState("");
  const [editFinal, setEditFinal] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const items = pricing.filter((p) => {
      if (supplyFilter === "trading" && p.supply_type !== "trading") return false;
      if (supplyFilter === "pb" && p.supply_type !== "pb") return false;
      if (supplyFilter === "available" && p.supply_type !== null) return false;
      if (supplyFilter === "hidden" && p.supply_type !== "hidden") return false;
      if (priceFilter === "priced" && p.price_id === null) return false;
      if (priceFilter === "unpriced" && p.price_id !== null) return false;
      if (!s) return true;
      return (
        p.product_name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s)
      );
    });

    items.sort((a, b) => {
      const typeOrder: Record<string, number> = { trading: 0, pb: 1, hidden: 3 };
      const aOrder = a.supply_type ? (typeOrder[a.supply_type] ?? 2) : 2;
      const bOrder = b.supply_type ? (typeOrder[b.supply_type] ?? 2) : 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aActive = a.product_status === "active" ? 0 : 1;
      const bActive = b.product_status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.product_name.localeCompare(b.product_name);
    });

    return items;
  }, [pricing, search, supplyFilter, priceFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.product_id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.product_id)));
    }
  }

  function toggleSelect(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function handleSetSupplyType(supplyType: "trading" | "pb" | "hidden" | null) {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      try {
        await setBuyerProductSupplyType({
          buyerOrgId,
          productIds: Array.from(selectedIds),
          supplyType,
        });
        setSelectedIds(new Set());
      } catch {
        alert("Failed to update supply type.");
      }
    });
  }

  function startEdit(row: AccountPricingRow) {
    setEditingId(row.product_id);
    setEditSettlement(row.settlement_price?.toString() ?? "");
    setEditFinal(row.final_price?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSettlement("");
    setEditFinal("");
  }

  function saveEdit(productId: string) {
    const settlement = parseFloat(editSettlement);
    const final_ = parseFloat(editFinal);

    if (isNaN(settlement) || isNaN(final_) || settlement < 0 || final_ < 0) {
      alert("Please enter valid positive numbers.");
      return;
    }

    if (final_ < settlement) {
      alert("Final price must be greater than or equal to settlement price.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertBuyerProductPrice({
          buyerOrgId,
          productId,
          settlementPrice: settlement,
          finalPrice: final_,
          currencyCode: currencyCode ?? "USD",
        });
        setEditingId(null);
        alert("Price saved successfully.");
      } catch {
        alert("Failed to save price.");
      }
    });
  }

  const tradingCount = pricing.filter((p) => p.supply_type === "trading").length;
  const pbCount = pricing.filter((p) => p.supply_type === "pb").length;
  const availableCount = pricing.filter((p) => p.supply_type === null).length;
  const hiddenCount = pricing.filter((p) => p.supply_type === "hidden").length;
  const pricedCount = pricing.filter((p) => p.price_id !== null).length;
  const unpricedCount = pricing.filter((p) => p.price_id === null).length;

  const supplyTabs: { value: SupplyFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: pricing.length },
    { value: "trading", label: "Trading", count: tradingCount },
    { value: "pb", label: "PB", count: pbCount },
    { value: "available", label: "Available", count: availableCount },
    { value: "hidden", label: "Hidden", count: hiddenCount },
  ];

  const priceTabs: { value: PriceFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: pricing.length },
    { value: "priced", label: "Priced", count: pricedCount },
    { value: "unpriced", label: "Unpriced", count: unpricedCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            {supplyTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setSupplyFilter(tab.value);
                  setSelectedIds(new Set());
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  supplyFilter === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            {priceTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setPriceFilter(tab.value);
                  setSelectedIds(new Set());
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  priceFilter === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <span className="text-muted-foreground">·</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSetSupplyType("trading")}
            disabled={isPending}
          >
            <ShoppingCart className="mr-1.5 size-3.5" />
            Trading
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSetSupplyType("pb")}
            disabled={isPending}
          >
            <ShieldCheck className="mr-1.5 size-3.5" />
            PB
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSetSupplyType(null)}
            disabled={isPending}
          >
            <Package className="mr-1.5 size-3.5" />
            Available
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSetSupplyType("hidden")}
            disabled={isPending}
          >
            <EyeOff className="mr-1.5 size-3.5" />
            Hide
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-3">
                <Checkbox
                  checked={allFilteredSelected && filtered.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-center">Type</th>
              <th className="px-4 py-3 font-medium text-right">Base (KRW)</th>
              <th className="px-4 py-3 font-medium text-right">Settlement</th>
              <th className="px-4 py-3 font-medium text-right">Final Price</th>
              <th className="px-4 py-3 font-medium text-right">Commission</th>
              <th className="px-4 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isEditing = editingId === row.product_id;
              const isSelected = selectedIds.has(row.product_id);
              const isInactive = row.product_status !== "active";

              return (
                <tr
                  key={row.product_id}
                  className={`border-b last:border-0 ${
                    isSelected ? "bg-primary/5" : ""
                  } ${isInactive ? "opacity-40" : row.supply_type === "hidden" ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(row.product_id)}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.sku}</td>
                  <td className="max-w-[240px] truncate px-4 py-2.5">
                    {row.product_name}
                    {isInactive && (
                      <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.supply_type ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${SUPPLY_TYPE_CONFIG[row.supply_type].color}`}
                      >
                        {SUPPLY_TYPE_CONFIG[row.supply_type].label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {row.base_price !== null
                      ? formatCurrency(row.base_price, "KRW")
                      : "-"}
                  </td>

                  {isEditing ? (
                    <>
                      <td className="px-4 py-2.5 text-right">
                        <Input
                          type="number"
                          value={editSettlement}
                          onChange={(e) => setEditSettlement(e.target.value)}
                          className="ml-auto h-8 w-28 text-right"
                          min={0}
                          step={0.01}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input
                          type="number"
                          value={editFinal}
                          onChange={(e) => setEditFinal(e.target.value)}
                          className="ml-auto h-8 w-28 text-right"
                          min={0}
                          step={0.01}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {(() => {
                          const s = parseFloat(editSettlement);
                          const f = parseFloat(editFinal);
                          if (isNaN(s) || isNaN(f) || s <= 0) return "-";
                          const amt = f - s;
                          const pct = (amt / s) * 100;
                          return (
                            <span>
                              {formatCurrency(amt, currencyCode)}{" "}
                              <span className="text-xs text-muted-foreground/70">({pct.toFixed(1)}%)</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => saveEdit(row.product_id)}
                            disabled={isPending}
                          >
                            <Check className="size-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={cancelEdit}
                            disabled={isPending}
                          >
                            <X className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-right">
                        {row.settlement_price !== null
                          ? formatCurrency(row.settlement_price, currencyCode)
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {row.final_price !== null
                          ? formatCurrency(row.final_price, currencyCode)
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.commission_amount > 0 && row.settlement_price ? (
                          <span className="text-amber-600">
                            {formatCurrency(row.commission_amount, currencyCode)}{" "}
                            <span className="text-xs text-amber-500/70">
                              ({((row.commission_amount / row.settlement_price) * 100).toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => startEdit(row)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
