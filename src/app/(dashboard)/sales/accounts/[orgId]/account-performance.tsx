"use client";

import { EmptyState } from "@/components/empty-state";
import type { AccountPerformanceStats } from "@/types";
import { BarChart3 } from "lucide-react";

type AccountPerformanceTabProps = {
  performance: AccountPerformanceStats | null;
  currencyCode: string | null;
};

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number, currency: string | null) {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(amount, currency);
}

export function AccountPerformanceTab({
  performance,
  currencyCode,
}: AccountPerformanceTabProps) {
  if (!performance || performance.total_orders === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No order history"
        description="This account has no completed orders yet."
      />
    );
  }

  const maxRevenue = Math.max(
    ...performance.monthly_revenue.map((m) => m.revenue),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: performance.total_orders.toLocaleString() },
          { label: "Total Revenue", value: formatCurrency(performance.total_revenue, currencyCode) },
          { label: "Avg Order Value", value: formatCurrency(performance.avg_order_value, currencyCode) },
          { label: "Items Ordered", value: performance.total_items_ordered.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {performance.monthly_revenue.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Monthly Revenue</h3>
          <div className="flex items-end gap-1" style={{ height: 200 }}>
            {performance.monthly_revenue.map((m) => {
              const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="group relative flex flex-1 flex-col items-center"
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${m.month}: ${formatCurrency(m.revenue, currencyCode)} (${m.order_count} orders)`}
                  />
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {m.month.slice(5)}
                  </span>
                  <div className="pointer-events-none absolute -top-8 hidden rounded bg-popover px-2 py-1 text-xs shadow-md group-hover:block">
                    {formatCompact(m.revenue, currencyCode)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {performance.top_products.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Top Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">SKU</th>
                  <th className="pb-2 pr-4 font-medium">Product</th>
                  <th className="pb-2 pr-4 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {performance.top_products.map((p, i) => (
                  <tr key={p.product_id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.sku}</td>
                    <td className="max-w-[240px] truncate py-2 pr-4">{p.product_name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {p.total_qty.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatCurrency(p.total_revenue, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
