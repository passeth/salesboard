"use client";

import { createAndSubmitOrder, saveDraft, submitDraft } from "@/app/(dashboard)/buyer/_actions/order-actions";
import { PageHeader } from "@/components/page-header";
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
import { Textarea } from "@/components/ui/textarea";
import { createOrderSchema } from "@/lib/validations/order";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { LineItemRow, OrderFormValues } from "./line-item-row";
import { ProductSelector, SelectableProduct } from "./product-selector";

type OrderFormProps = {
  products: SelectableProduct[];
  shipToOrgs: Array<{ id: string; name: string }>;
  preSelectedProductId?: string;
  userOrgId: string;
  draftId?: string;
  initialValues?: {
    items: Array<{
      product_id: string;
      product_name: string;
      product_sku: string;
      requested_qty: number;
      units_per_case: number | null;
      unit_price: number | null;
      image_url: string | null;
    }>;
    requested_delivery_date: string | null;
    ship_to_org_id: string;
    memo: string;
  };
};

const formSchema = createOrderSchema.extend({
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      product_sku: z.string(),
      requested_qty: z.number().int().min(1),
      units_per_case: z.number().int().positive().nullable(),
      unit_price: z.number().nonnegative().nullable(),
      image_url: z.string().nullable(),
    }),
  ),
});

export function OrderForm({
  products,
  shipToOrgs,
  preSelectedProductId,
  userOrgId,
  draftId,
  initialValues,
}: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultShipTo = shipToOrgs[0]?.id ?? userOrgId;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues ?? {
      items: [],
      requested_delivery_date: null,
      ship_to_org_id: defaultShipTo,
      memo: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");

  const selectedProductIds = useMemo(
    () => watchedItems.map((item) => item.product_id),
    [watchedItems],
  );

  const totals = useMemo(() => {
    const totalLines = watchedItems.length;
    const totalBoxes = watchedItems.reduce((sum, item) => sum + (item.requested_qty || 0), 0);
    const totalPieces = watchedItems.reduce((sum, item) => {
      if (item.units_per_case === null) {
        return sum;
      }

      return sum + (item.requested_qty || 0) * item.units_per_case;
    }, 0);

    return { totalLines, totalBoxes, totalPieces };
  }, [watchedItems]);

  useEffect(() => {
    if (!preSelectedProductId) {
      return;
    }

    if (selectedProductIds.includes(preSelectedProductId)) {
      return;
    }

    const product = products.find((candidate) => candidate.id === preSelectedProductId);
    if (!product) {
      return;
    }

    append({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      requested_qty: 1,
      units_per_case: product.units_per_case,
      unit_price: null,
      image_url: product.image_url,
    });
  }, [append, preSelectedProductId, products, selectedProductIds]);

  const addProduct = (product: SelectableProduct) => {
    if (selectedProductIds.includes(product.id)) {
      return;
    }

    append({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      requested_qty: 1,
      units_per_case: product.units_per_case,
      unit_price: null,
      image_url: product.image_url,
    });
  };

  const buildPayload = (values: OrderFormValues) => ({
    ordering_org_id: userOrgId,
    ship_to_org_id: values.ship_to_org_id,
    requested_delivery_date: values.requested_delivery_date,
    memo: values.memo,
    items: values.items.map((item) => ({
      product_id: item.product_id,
      requested_qty: item.requested_qty,
      units_per_case: item.units_per_case,
      unit_price: item.unit_price,
    })),
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (draftId) {
        await submitDraft(draftId);
      } else {
        await createAndSubmitOrder(buildPayload(values));
      }
    });
  });

  const onSaveDraft = () => {
    const values = form.getValues();
    startTransition(async () => {
      await saveDraft({ ...buildPayload(values), draftId });
    });
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
      <PageHeader title="Create New Order" />

      <Card>
        <CardHeader>
          <CardTitle>Delivery Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="requested_delivery_date">Requested Delivery Date</Label>
            <Input
              id="requested_delivery_date"
              type="date"
              {...form.register("requested_delivery_date")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ship_to_org_id">Ship To</Label>
            {shipToOrgs.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
                No ship-to locations registered.{" "}
                <a href="/buyer/ship-to" className="text-primary underline underline-offset-4 hover:text-primary/80">
                  Add one
                </a>
              </div>
            ) : (
              <Select
                value={form.watch("ship_to_org_id")}
                onValueChange={(value) => form.setValue("ship_to_org_id", value)}
              >
                <SelectTrigger id="ship_to_org_id">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {shipToOrgs.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea
              id="memo"
              rows={3}
              maxLength={500}
              placeholder="Optional notes for this order"
              {...form.register("memo")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Order Items</CardTitle>
          <ProductSelector
            products={products}
            onSelect={addProduct}
            selectedIds={selectedProductIds}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[minmax(220px,1fr)_120px_100px_180px_140px_44px] gap-3 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Product</span>
            <span>Qty (boxes)</span>
            <span>UPC</span>
            <span>Pcs</span>
            <span>Price</span>
            <span />
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add at least one product to start this order.
            </div>
          ) : (
            fields.map((field, index) => (
              <LineItemRow
                key={field.id}
                index={index}
                item={watchedItems[index]}
                control={form.control}
                onRemove={() => remove(index)}
              />
            ))
          )}

          {watchedItems.some((item) => item.units_per_case === null) ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="size-4" />
              Units per case unknown for some products.
            </div>
          ) : null}

          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Total items: <span className="font-medium text-foreground">{totals.totalLines}</span> | Total boxes:{" "}
            <span className="font-medium text-foreground">{totals.totalBoxes}</span> | Total pcs:{" "}
            <span className="font-medium text-foreground">{totals.totalPieces}</span>
          </div>
        </CardContent>
      </Card>

      {form.formState.errors.items?.message ? (
        <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/buyer/orders")}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={onSaveDraft}>
          {isPending ? "Saving..." : "Save as Draft"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={isPending || watchedItems.length === 0}>
              {isPending ? "Submitting..." : "Submit Order"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit this order?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to submit an order with {watchedItems.length} item(s) ({totals.totalBoxes} boxes).
                This order will be sent for review and cannot be edited after submission.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={onSubmit} disabled={isPending}>
                Confirm &amp; Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </form>
  );
}
