"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type SelectableProduct = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  units_per_case: number | null;
  image_url: string | null;
};

type ProductSelectorProps = {
  products: SelectableProduct[];
  onSelect: (product: SelectableProduct) => void;
  selectedIds: string[];
};

export function ProductSelector({ products, onSelect, selectedIds }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    return products.filter((product) => {
      const label = `${product.name} ${product.sku}`.toLowerCase();
      return label.includes(normalized);
    });
  }, [products, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select product</DialogTitle>
          <DialogDescription>Search by product name or SKU.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[360px] rounded-md border">
          <div className="divide-y">
            {filteredProducts.map((product) => {
              const alreadySelected = selectedIds.includes(product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={alreadySelected}
                  onClick={() => {
                    onSelect(product);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    alreadySelected
                      ? "cursor-not-allowed bg-muted/50 text-muted-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  <div className="size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>

                  {product.brand ? (
                    <Badge variant="secondary" className="hidden md:inline-flex">
                      {product.brand}
                    </Badge>
                  ) : null}

                  {alreadySelected ? (
                    <Badge variant="outline" className="gap-1">
                      <Check className="size-3" />
                      Added
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
