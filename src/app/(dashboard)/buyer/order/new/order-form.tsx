"use client";

import { updateCartItemQty, removeCartItem, clearCart } from "@/app/(dashboard)/buyer/_actions/cart-actions";
import { submitDraft } from "@/app/(dashboard)/buyer/_actions/order-actions";
import { EmptyState } from "@/components/empty-state";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { BuyerDraftOrder } from "@/types";
import { ArrowLeft, Package, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { LineItemRow } from "./line-item-row";

type OrderFormProps = {
  draftOrder: BuyerDraftOrder | null;
  shipToOrgs: Array<{ id: string; name: string }>;
  orgId: string;
};

export function OrderForm({ draftOrder, shipToOrgs, orgId }: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shipToOrgId, setShipToOrgId] = useState(
    draftOrder?.ship_to_org_id ?? shipToOrgs[0]?.id ?? ""
  );
  const [deliveryDate, setDeliveryDate] = useState(
    draftOrder?.requested_delivery_date ?? ""
  );
  const [memo, setMemo] = useState(draftOrder?.memo ?? "");

  const totals = useMemo(() => {
    if (!draftOrder?.items) {
      return {
        totalItems: 0,
        totalBoxes: 0,
        totalPcs: 0,
        totalWeight: 0,
        totalAmount: 0,
        totalCbm: 0,
        hasPriceTbd: false,
      };
    }

    const items = draftOrder.items;
    const totalItems = items.length;
    const totalBoxes = items.reduce((sum, item) => sum + item.requested_qty, 0);
    const totalPcs = items.reduce(
      (sum, item) => sum + item.requested_qty * (item.units_per_case ?? 0),
      0
    );
    const totalWeight = items.reduce(
      (sum, item) => sum + item.requested_qty * (item.gross_weight ?? 0),
      0
    );
    const totalAmount = items.reduce(
      (sum, item) => sum + item.requested_qty * (item.unit_price ?? 0),
      0
    );
    const totalCbm = items.reduce(
      (sum, item) => sum + item.requested_qty * (item.cbm ?? 0),
      0
    );
    const hasPriceTbd = items.some((item) => item.unit_price === null);

    return {
      totalItems,
      totalBoxes,
      totalPcs,
      totalWeight,
      totalAmount,
      totalCbm,
      hasPriceTbd,
    };
  }, [draftOrder?.items]);

  const handleSubmit = () => {
    if (!draftOrder) return;

    startTransition(async () => {
      await submitDraft(draftOrder.id);
    });
  };

  const handleClearCart = () => {
    if (!draftOrder) return;

    startTransition(async () => {
      await clearCart(draftOrder.id);
      router.push("/buyer/products");
    });
  };

  if (!draftOrder) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Add products from the catalog to get started"
        action={{
          label: "Browse Products",
          href: "/buyer/products",
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="size-4" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.totalItems}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Boxes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.totalBoxes.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pcs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.totalPcs.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.totalWeight.toFixed(1)} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totals.totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {totals.hasPriceTbd && (
              <p className="text-xs text-muted-foreground">(Price TBD)</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total CBM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.totalCbm.toFixed(3)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Cart Items</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 size-4" />
                Clear Cart
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear cart?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all items from your cart. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCart}>
                  Clear Cart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[100px]">Unit Price</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[100px]">Pcs</TableHead>
                <TableHead className="w-[100px]">Weight</TableHead>
                <TableHead className="w-[120px]">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftOrder.items.map((item) => (
                <LineItemRow
                  key={item.id}
                  orderId={draftOrder.id}
                  item={item}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ship_to_org_id">Ship To</Label>
            {shipToOrgs.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
                No ship-to locations registered.{" "}
                <Link
                  href="/buyer/ship-to"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Add one
                </Link>
              </div>
            ) : (
              <Select value={shipToOrgId} onValueChange={setShipToOrgId}>
                <SelectTrigger id="ship_to_org_id">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {shipToOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested_delivery_date">
              Requested Delivery Date
            </Label>
            <Input
              id="requested_delivery_date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea
              id="memo"
              rows={3}
              maxLength={500}
              placeholder="Optional notes for this order"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" asChild>
          <Link href="/buyer/products">
            <ArrowLeft className="mr-2 size-4" />
            Back to Products
          </Link>
        </Button>

        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="mr-2 size-4" />
                Clear Cart
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear cart?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all items from your cart. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCart}>
                  Clear Cart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isPending || draftOrder.items.length === 0}>
                {isPending ? "Submitting..." : "Submit Order"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to submit an order with {totals.totalItems}{" "}
                  item(s) ({totals.totalBoxes} boxes). This order will be sent
                  for review and cannot be edited after submission.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  Confirm &amp; Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
