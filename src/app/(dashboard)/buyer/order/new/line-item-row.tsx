"use client";

import { BoxQuantityDisplay } from "@/components/box-quantity-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Control, Controller, FieldPath } from "react-hook-form";
import { X } from "lucide-react";

export type OrderItemFormValue = {
  product_id: string;
  product_name: string;
  product_sku: string;
  requested_qty: number;
  units_per_case: number | null;
  unit_price: number | null;
  image_url: string | null;
};

export type OrderFormValues = {
  items: OrderItemFormValue[];
  requested_delivery_date: string | null;
  ship_to_org_id: string;
  memo: string;
};

type LineItemRowProps = {
  index: number;
  item: OrderItemFormValue;
  control: Control<OrderFormValues>;
  onRemove: () => void;
  disableRemove?: boolean;
};

function getFieldName<T extends FieldPath<OrderFormValues>>(value: T): T {
  return value;
}

export function LineItemRow({
  index,
  item,
  control,
  onRemove,
  disableRemove = false,
}: LineItemRowProps) {
  return (
    <div className="grid grid-cols-[minmax(220px,1fr)_120px_100px_180px_140px_44px] items-start gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 overflow-hidden rounded-md border bg-muted">
          {item.image_url ? (
            <img src={item.image_url} alt={item.product_name} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.product_name}</p>
          <p className="text-xs text-muted-foreground">{item.product_sku}</p>
        </div>
      </div>

      <Controller
        control={control}
        name={getFieldName(`items.${index}.requested_qty`)}
        render={({ field }) => (
          <Input
            type="number"
            min={1}
            step={1}
            value={field.value}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              field.onChange(Number.isNaN(parsed) ? 1 : Math.max(parsed, 1));
            }}
          />
        )}
      />

      <div className={cn("flex h-10 items-center rounded-md border px-3 text-sm", item.units_per_case === null && "border-amber-300 bg-amber-50 text-amber-900")}>
        {item.units_per_case ?? "Unknown"}
      </div>

      <Controller
        control={control}
        name={getFieldName(`items.${index}.requested_qty`)}
        render={({ field }) => (
          <BoxQuantityDisplay
            boxes={Number(field.value) || 0}
            unitsPerCase={item.units_per_case}
            className="h-10"
          />
        )}
      />

      <Controller
        control={control}
        name={getFieldName(`items.${index}.unit_price`)}
        render={({ field }) => (
          <Input
            type="number"
            min={0}
            step="0.01"
            value={field.value ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") {
                field.onChange(null);
                return;
              }

              const parsed = Number(raw);
              field.onChange(Number.isNaN(parsed) ? null : parsed);
            }}
            placeholder="0.00"
          />
        )}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disableRemove}
      >
        <X className="size-4" />
      </Button>

      {item.units_per_case === null ? (
        <div className="col-span-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Units per case unknown. Total piece calculation may be unavailable.
        </div>
      ) : null}
    </div>
  );
}
