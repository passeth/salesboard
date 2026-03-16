"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackingShipmentContext, PackingSourceItem } from "@/lib/packing/types";
import { ShipmentPallet } from "@/lib/queries/shipments";
import { Printer, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type PackingListEditorProps = {
  orderNo: string;
  shipmentNo?: string | null;
  buyerName?: string | null;
  shipmentContext: PackingShipmentContext;
  orderItems: PackingSourceItem[];
  pallets: ShipmentPallet[];
};

type PackingListRow = {
  id: string;
  lineNo: number;
  sku: string;
  productName: string;
  palletNo: string;
  packedCaseQty: number;
  packedUnitQty: number;
  unitPrice: number | null;
  lotNo: string | null;
  expiryDate: string | null;
  partial: boolean;
  source: "order" | "pallet";
};

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function buildInitialRows(orderItems: PackingSourceItem[], pallets: ShipmentPallet[]) {
  const unitPriceByOrderItemId = new Map(orderItems.map((item) => [item.orderItemId, item.unitPrice]));
  const rowsFromPallets = pallets.flatMap((pallet) =>
    pallet.items.map((item) => ({
      id: item.id,
      lineNo: orderItems.find((orderItem) => orderItem.orderItemId === item.order_item_id)?.lineNo ?? 0,
      sku: item.product?.sku ?? "-",
      productName: item.product?.name ?? "-",
      palletNo: pallet.pallet_no,
      packedCaseQty: item.packed_case_qty,
      packedUnitQty: item.packed_unit_qty,
      unitPrice: unitPriceByOrderItemId.get(item.order_item_id) ?? null,
      lotNo: item.inventory_lot?.lot_no ?? null,
      expiryDate: item.expiry_date_snapshot,
      partial: item.is_partial_case,
      source: "pallet" as const,
    })),
  );

  if (rowsFromPallets.length > 0) {
    return rowsFromPallets;
  }

  return orderItems.map((item) => ({
    id: item.orderItemId,
    lineNo: item.lineNo,
    sku: item.product.sku,
    productName: item.product.name,
    palletNo: "Draft / Unassigned",
    packedCaseQty: item.packableCaseQty,
    packedUnitQty: item.packableUnitQty,
    unitPrice: item.unitPrice,
    lotNo: null,
    expiryDate: null,
    partial: false,
    source: "order" as const,
  }));
}

export function PackingListEditor({
  orderNo,
  shipmentNo,
  buyerName,
  shipmentContext,
  orderItems,
  pallets,
}: PackingListEditorProps) {
  const [rows, setRows] = useState<PackingListRow[]>(() => buildInitialRows(orderItems, pallets));
  const isOrderDraft = rows.every((row) => row.source === "order");
  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => {
          sum.cases += row.packedCaseQty;
          sum.units += row.packedUnitQty;
          sum.amount += row.unitPrice !== null ? row.unitPrice * row.packedUnitQty : 0;
          return sum;
        },
        { cases: 0, units: 0, amount: 0 },
      ),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total cases</CardDescription>
            <CardTitle>{formatNumber(totals.cases)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total units</CardDescription>
            <CardTitle>{formatNumber(totals.units)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total amount</CardDescription>
            <CardTitle>{totals.amount > 0 ? formatCurrency(totals.amount) : "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Destination</CardDescription>
            <CardTitle>{shipmentContext.destinationCode ?? shipmentContext.destinationName ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Packing List Draft</CardTitle>
            <CardDescription>
              {shipmentNo ? `Shipment ${shipmentNo} · ` : ""}
              Order {orderNo}
              {buyerName ? ` · ${buyerName}` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isOrderDraft ? (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-900">
                <Sparkles className="size-3" />
                Seeded from order quantities
              </Badge>
            ) : (
              <Badge variant="outline">Loaded from pallet packing</Badge>
            )}
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOrderDraft ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Saved pallet packing is not available yet, so this draft is initialized directly from `orders / order_items`.
            </div>
          ) : null}

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Pallet</TableHead>
                  <TableHead className="text-right">Cases</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.lineNo || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.productName}</p>
                        <p className="text-xs text-muted-foreground">{row.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{row.palletNo}</span>
                        {row.partial ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                            Partial
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={row.packedCaseQty}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, packedCaseQty: Number.isFinite(nextValue) ? nextValue : 0 }
                                : candidate,
                            ),
                          );
                        }}
                        className="ml-auto w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={row.packedUnitQty}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, packedUnitQty: Number.isFinite(nextValue) ? nextValue : 0 }
                                : candidate,
                            ),
                          );
                        }}
                        className="ml-auto w-28 text-right"
                      />
                    </TableCell>
                    <TableCell>{row.lotNo ?? "-"}</TableCell>
                    <TableCell>{formatDate(row.expiryDate)}</TableCell>
                    <TableCell className="text-right">
                      {row.unitPrice !== null ? formatCurrency(row.unitPrice * row.packedUnitQty) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell className="text-right">{formatNumber(totals.cases)}</TableCell>
                  <TableCell className="text-right">{formatNumber(totals.units)}</TableCell>
                  <TableCell colSpan={2} />
                  <TableCell className="text-right">
                    {totals.amount > 0 ? formatCurrency(totals.amount) : "-"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
