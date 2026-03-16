"use client";

import {
  salesConfirmOrder,
  salesRequestBuyerDecision,
  SalesConfirmItemInput,
} from "@/app/(dashboard)/sales/_actions/sales-actions";
import { OrderItemStatusBadge } from "@/components/order-item-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { InventoryLotRow, OrderItemStatus, OrderItemWithProduct } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SalesActionsBar } from "./sales-actions-bar";

type SalesOrderItemsProps = {
  orderId: string;
  items: OrderItemWithProduct[];
  inventoryByProductId: Record<string, InventoryLotRow[]>;
};

type EditableItemState = {
  sales_confirmed_qty: number;
  allocation_type: "stock" | "production" | "mixed";
  decision_note: string;
};

function getInitialItemState(item: OrderItemWithProduct): EditableItemState {
  return {
    sales_confirmed_qty: item.sales_confirmed_qty ?? item.vendor_confirmed_qty ?? item.requested_qty,
    allocation_type: item.allocation_type ?? "stock",
    decision_note: item.decision_note ?? "",
  };
}

function getDerivedStatus(salesConfirmedQty: number, requestedQty: number, fallback: OrderItemStatus) {
  if (salesConfirmedQty <= 0) {
    return fallback;
  }

  if (salesConfirmedQty < requestedQty) {
    return "partial" as const;
  }

  return "confirmed" as const;
}

function getInventorySummary(lots: InventoryLotRow[]) {
  if (lots.length === 0) {
    return { totalAvailable: 0, lotCount: 0, earliestExpiry: null as string | null };
  }

  let totalAvailable = 0;
  let earliestExpiry: string | null = null;

  for (const lot of lots) {
    totalAvailable += lot.available_qty;
    if (lot.expiry_date) {
      if (!earliestExpiry || lot.expiry_date < earliestExpiry) {
        earliestExpiry = lot.expiry_date;
      }
    }
  }

  return { totalAvailable, lotCount: lots.length, earliestExpiry };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-CA");
}

function renderDiff(current: number | null, baseline: number) {
  if (current === null) {
    return null;
  }

  const diff = current - baseline;
  const sign = diff > 0 ? "+" : "";
  const tone = diff < 0 ? "text-red-600" : "text-emerald-600";

  return <p className={`text-xs ${tone}`}>({sign}{diff} boxes)</p>;
}

export function SalesOrderItems({ orderId, items, inventoryByProductId }: SalesOrderItemsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderNote, setOrderNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditableItemState>>(() => {
    const initial: Record<string, EditableItemState> = {};
    items.forEach((item) => {
      initial[item.id] = getInitialItemState(item);
    });
    return initial;
  });

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const current = edits[item.id] ?? getInitialItemState(item);
          acc.requested += item.requested_qty;
          acc.vendor += item.vendor_confirmed_qty ?? 0;
          acc.sales += current.sales_confirmed_qty;
          return acc;
        },
        { requested: 0, vendor: 0, sales: 0 },
      ),
    [edits, items],
  );

  const updateItem = (id: string, patch: Partial<EditableItemState>) => {
    setEdits((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? ({} as EditableItemState)),
        ...patch,
      },
    }));
  };

  const buildPayload = (): SalesConfirmItemInput[] =>
    items.map((item) => {
      const current = edits[item.id] ?? getInitialItemState(item);

      return {
        id: item.id,
        sales_confirmed_qty: current.sales_confirmed_qty,
        allocation_type: current.allocation_type,
        decision_note: current.decision_note.trim() || null,
      };
    });

  const handleRequestBuyerDecision = () => {
    setErrorMessage(null);
    const payload = buildPayload();

    startTransition(async () => {
      try {
        await salesRequestBuyerDecision(orderId, payload, orderNote.trim() || null);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to request buyer decision");
      }
    });
  };

  const handleFullConfirm = () => {
    setErrorMessage(null);
    const payload: SalesConfirmItemInput[] = items.map((item) => ({
      id: item.id,
      sales_confirmed_qty: item.vendor_confirmed_qty ?? item.requested_qty,
      allocation_type: (edits[item.id]?.allocation_type ?? item.allocation_type ?? "stock") as
        | "stock"
        | "production"
        | "mixed",
      decision_note: (edits[item.id]?.decision_note ?? item.decision_note ?? "").trim() || null,
    }));

    setEdits((current) => {
      const next = { ...current };
      items.forEach((item) => {
        next[item.id] = {
          sales_confirmed_qty: item.vendor_confirmed_qty ?? item.requested_qty,
          allocation_type: current[item.id]?.allocation_type ?? item.allocation_type ?? "stock",
          decision_note: current[item.id]?.decision_note ?? item.decision_note ?? "",
        };
      });
      return next;
    });

    startTransition(async () => {
      try {
        await salesConfirmOrder(orderId, payload);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to confirm order");
      }
    });
  };

  return (
    <>
      <Card className="pb-24">
        <CardHeader>
          <CardTitle>Sales Review Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="min-w-[180px]">Product</TableHead>
                <TableHead className="w-[90px] text-right">Requested</TableHead>
                <TableHead className="w-[80px] text-right">Avail.</TableHead>
                <TableHead className="w-[50px] text-center">Lots</TableHead>
                <TableHead className="w-[90px]">Expiry</TableHead>
                <TableHead className="w-[90px] text-right">Vendor</TableHead>
                <TableHead className="w-[110px] text-right">Sales Qty</TableHead>
                <TableHead className="w-[110px]">Allocation</TableHead>
                <TableHead className="w-[160px]">Note</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const current = edits[item.id] ?? getInitialItemState(item);
                const status = getDerivedStatus(current.sales_confirmed_qty, item.requested_qty, item.status);
                const lots = inventoryByProductId[item.product_id] ?? [];
                const inv = getInventorySummary(lots);
                const isShortage = inv.totalAvailable < item.requested_qty;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.line_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-9 overflow-hidden rounded-md border bg-muted">
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
                    <TableCell className="text-right tabular-nums">
                      <p className="font-medium">{item.requested_qty.toLocaleString()}</p>
                      {item.units_per_case ? (
                        <p className="text-xs text-muted-foreground">
                          {(item.requested_qty * item.units_per_case).toLocaleString()} pcs
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {inv.lotCount === 0 ? (
                        <span className="text-xs text-amber-600">No stock</span>
                      ) : (
                        <p className={`font-medium ${isShortage ? "text-red-600" : "text-emerald-600"}`}>
                          {inv.totalAvailable.toLocaleString()}
                        </p>
                      )}
                      {isShortage && inv.lotCount > 0 ? (
                        <p className="text-xs text-red-500">
                          -{(item.requested_qty - inv.totalAvailable).toLocaleString()} short
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {inv.lotCount > 0 ? inv.lotCount : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.earliestExpiry ? formatDate(inv.earliestExpiry) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.vendor_confirmed_qty === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <>
                          <p className="font-medium">{item.vendor_confirmed_qty.toLocaleString()}</p>
                          {item.units_per_case ? (
                            <p className="text-xs text-muted-foreground">
                              {(item.vendor_confirmed_qty * item.units_per_case).toLocaleString()} pcs
                            </p>
                          ) : null}
                          {renderDiff(item.vendor_confirmed_qty, item.requested_qty)}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="h-8 w-full text-right tabular-nums"
                          value={current.sales_confirmed_qty}
                          disabled={isPending}
                          onChange={(event) => {
                            const nextValue = Number.parseInt(event.target.value, 10);
                            updateItem(item.id, {
                              sales_confirmed_qty: Number.isNaN(nextValue) ? 0 : nextValue,
                            });
                          }}
                        />
                        {item.units_per_case ? (
                          <p className="text-right text-xs text-muted-foreground tabular-nums">
                            {(current.sales_confirmed_qty * item.units_per_case).toLocaleString()} pcs
                          </p>
                        ) : null}
                        {renderDiff(current.sales_confirmed_qty, item.requested_qty)}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Select
                        value={current.allocation_type}
                        onValueChange={(value: "stock" | "production" | "mixed") =>
                          updateItem(item.id, { allocation_type: value })
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder="Allocation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stock">Stock</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        rows={1}
                        className="min-h-8 w-full resize-none text-xs"
                        value={current.decision_note}
                        disabled={isPending}
                        onChange={(event) =>
                          updateItem(item.id, {
                            decision_note: event.target.value,
                          })
                        }
                        placeholder="Note"
                      />
                    </TableCell>
                    <TableCell>
                      <OrderItemStatusBadge status={status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-medium">
                <TableCell colSpan={2}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">{totals.requested.toLocaleString()}</TableCell>
                <TableCell colSpan={3} />
                <TableCell className="text-right tabular-nums">{totals.vendor.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.sales.toLocaleString()}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <SalesActionsBar
        isPending={isPending}
        decisionNote={orderNote}
        onDecisionNoteChange={setOrderNote}
        onFullConfirm={handleFullConfirm}
        onRequestBuyerDecision={handleRequestBuyerDecision}
      />
    </>
  );
}
