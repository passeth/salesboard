"use client";

import { OrderItemStatusBadge } from "@/components/order-item-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { OrderItemWithProduct, OrderStatus } from "@/types";

type OrderItemsTableProps = {
  items: OrderItemWithProduct[];
  orderStatus: OrderStatus | string;
  currencyCode?: string;
};

function formatCurrency(value: number | null, currencyCode: string = "USD") {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQty(boxes: number | null, unitsPerCase: number | null) {
  if (boxes === null) return { boxes: "-", pcs: "-" };
  const pcs = unitsPerCase ? (boxes * unitsPerCase).toLocaleString() : "-";
  return { boxes: boxes.toLocaleString(), pcs };
}

function renderDiff(current: number | null, baseline: number) {
  if (current === null) return null;
  const diff = current - baseline;
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "";
  return (
    <span className={cn("text-[11px] tabular-nums", diff < 0 ? "text-red-600" : "text-emerald-600")}>
      {sign}{diff}
    </span>
  );
}

export function OrderItemsTable({ items, orderStatus, currencyCode = "USD" }: OrderItemsTableProps) {
  const totals = items.reduce(
    (acc, item) => {
      acc.requested += item.requested_qty;
      acc.requestedPcs += item.units_per_case ? item.requested_qty * item.units_per_case : 0;
      acc.vendor += item.vendor_confirmed_qty ?? 0;
      acc.vendorPcs += item.units_per_case ? (item.vendor_confirmed_qty ?? 0) * item.units_per_case : 0;
      acc.sales += item.sales_confirmed_qty ?? 0;
      acc.salesPcs += item.units_per_case ? (item.sales_confirmed_qty ?? 0) * item.units_per_case : 0;
      acc.final += item.final_qty ?? 0;
      acc.finalPcs += item.units_per_case ? (item.final_qty ?? 0) * item.units_per_case : 0;
      acc.totalAmount += item.unit_price !== null ? item.unit_price * item.requested_qty : 0;
      return acc;
    },
    { requested: 0, requestedPcs: 0, vendor: 0, vendorPcs: 0, sales: 0, salesPcs: 0, final: 0, finalPcs: 0, totalAmount: 0 },
  );

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order Items</h2>
        <p className="text-sm text-muted-foreground">{items.length} items</p>
      </div>

      <div className="overflow-x-auto">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead rowSpan={2} className="border-b align-bottom">#</TableHead>
                <TableHead rowSpan={2} className="border-b align-bottom">Product</TableHead>
                <TableHead rowSpan={2} className="border-b align-bottom text-right">Pcs/Case</TableHead>
                <TableHead colSpan={2} className="border-b border-l text-center text-xs font-medium text-muted-foreground">Requested</TableHead>
                <TableHead colSpan={2} className="border-b border-l text-center text-xs font-medium text-muted-foreground">Vendor Confirmed</TableHead>
                <TableHead colSpan={2} className="border-b border-l text-center text-xs font-medium text-muted-foreground">Sales Confirmed</TableHead>
                <TableHead colSpan={2} className="border-b border-l text-center text-xs font-medium text-muted-foreground">Final</TableHead>
                <TableHead rowSpan={2} className="border-b border-l align-bottom text-right">Unit Price</TableHead>
                <TableHead rowSpan={2} className="border-b border-l align-bottom text-right">Amount</TableHead>
                <TableHead rowSpan={2} className="border-b border-l align-bottom">Status</TableHead>
                <TableHead rowSpan={2} className="border-b border-l align-bottom">Note</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="border-l text-right text-xs">Boxes</TableHead>
                <TableHead className="text-right text-xs">Pcs</TableHead>
                <TableHead className="border-l text-right text-xs">Boxes</TableHead>
                <TableHead className="text-right text-xs">Pcs</TableHead>
                <TableHead className="border-l text-right text-xs">Boxes</TableHead>
                <TableHead className="text-right text-xs">Pcs</TableHead>
                <TableHead className="border-l text-right text-xs">Boxes</TableHead>
                <TableHead className="text-right text-xs">Pcs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const req = formatQty(item.requested_qty, item.units_per_case);
                const vendor = formatQty(item.vendor_confirmed_qty, item.units_per_case);
                const sales = formatQty(item.sales_confirmed_qty, item.units_per_case);
                const final_ = formatQty(item.final_qty, item.units_per_case);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{item.line_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-8 shrink-0 overflow-hidden rounded border bg-muted">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="size-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {item.units_per_case ?? "-"}
                    </TableCell>
                    <TableCell className="border-l text-right tabular-nums">{req.boxes}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{req.pcs}</TableCell>
                    <TableCell className="border-l text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        {vendor.boxes}
                        {renderDiff(item.vendor_confirmed_qty, item.requested_qty)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{vendor.pcs}</TableCell>
                    <TableCell className="border-l text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        {sales.boxes}
                        {renderDiff(item.sales_confirmed_qty, item.requested_qty)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{sales.pcs}</TableCell>
                    <TableCell className="border-l text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        {final_.boxes}
                        {renderDiff(item.final_qty, item.requested_qty)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{final_.pcs}</TableCell>
                    <TableCell className="border-l text-right tabular-nums">{formatCurrency(item.unit_price, currencyCode)}</TableCell>
                    <TableCell className="border-l text-right tabular-nums">
                      {item.unit_price !== null ? formatCurrency(item.unit_price * item.requested_qty, currencyCode) : "-"}
                    </TableCell>
                    <TableCell className="border-l">
                      <OrderItemStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="border-l">
                      {item.decision_note ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-1 max-w-[180px] cursor-help text-sm">
                              {item.decision_note}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            {item.decision_note}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-medium">Totals</TableCell>
                <TableCell />
                <TableCell className="border-l text-right tabular-nums font-medium">{totals.requested.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{totals.requestedPcs.toLocaleString()}</TableCell>
                <TableCell className="border-l text-right tabular-nums font-medium">{totals.vendor.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{totals.vendorPcs.toLocaleString()}</TableCell>
                <TableCell className="border-l text-right tabular-nums font-medium">{totals.sales.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{totals.salesPcs.toLocaleString()}</TableCell>
                <TableCell className="border-l text-right tabular-nums font-medium">{totals.final.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{totals.finalPcs.toLocaleString()}</TableCell>
                <TableCell className="border-l" />
                <TableCell className="border-l text-right tabular-nums font-medium">
                  {totals.totalAmount > 0 ? formatCurrency(totals.totalAmount, currencyCode) : "-"}
                </TableCell>
                <TableCell colSpan={2} className="border-l" />
              </TableRow>
            </TableFooter>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}
