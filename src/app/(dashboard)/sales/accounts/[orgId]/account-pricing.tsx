"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  upsertBuyerProductPrice,
} from "@/app/(dashboard)/sales/_actions/accounts-actions";
import type { AccountPricingRow } from "@/types";
import { Check, Pencil, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type AccountPricingTabProps = {
  pricing: AccountPricingRow[];
  buyerOrgId: string;
  currencyCode: string | null;
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSettlement, setEditSettlement] = useState("");
  const [editFinal, setEditFinal] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const items = pricing.filter((p) => {
      if (!s) return true;
      return (
        p.product_name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s)
      );
    });

    items.sort((a, b) => {
      const aHasPrice = a.price_id !== null ? 1 : 0;
      const bHasPrice = b.price_id !== null ? 1 : 0;
      if (aHasPrice !== bHasPrice) return bHasPrice - aHasPrice;
      const aOrdered = a.has_orders ? 1 : 0;
      const bOrdered = b.has_orders ? 1 : 0;
      if (aOrdered !== bOrdered) return bOrdered - aOrdered;
      return a.product_name.localeCompare(b.product_name);
    });

    return items;
  }, [pricing, search]);

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

  const pricedCount = pricing.filter((p) => p.price_id !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pricedCount} of {pricing.length} products have pricing set
        </p>
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Product</th>
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

              return (
                <tr
                  key={row.product_id}
                  className={`border-b last:border-0 ${
                    !row.has_orders && row.price_id === null ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{row.sku}</td>
                  <td className="max-w-[240px] truncate px-4 py-2.5">{row.product_name}</td>
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
                        {!isNaN(parseFloat(editFinal)) && !isNaN(parseFloat(editSettlement))
                          ? formatCurrency(
                              parseFloat(editFinal) - parseFloat(editSettlement),
                              currencyCode,
                            )
                          : "-"}
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
                        {row.commission_amount > 0 ? (
                          <span className="text-amber-600">
                            {formatCurrency(row.commission_amount, currencyCode)}
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
