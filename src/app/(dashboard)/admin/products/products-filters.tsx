"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProductsFiltersProps = {
  brands: string[];
  categories: string[];
  currentBrand?: string;
  currentCategory?: string;
  currentStatus?: string;
  currentSearch?: string;
};

const PRODUCT_CATEGORIES = ["Skin", "Body", "Hair", "Perfume", "Other"] as const;
const PRODUCT_STATUSES = ["active", "inactive"] as const;

export function ProductsFilters({
  brands,
  categories,
  currentBrand,
  currentCategory,
  currentStatus,
  currentSearch,
}: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch ?? "");

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
          return;
        }

        params.set(key, value);
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (currentSearch ?? "")) {
        updateFilters({ search: searchValue || null });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateFilters]);

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_220px_220px_220px_auto] md:items-end">
      <div className="space-y-2">
        <p className="text-sm font-medium">Search</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, SKU, barcode..."
            className="pl-9"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Brand</p>
        <Select
          value={currentBrand ?? "all"}
          onValueChange={(value) => updateFilters({ brand: value === "all" ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Category</p>
        <Select
          value={currentCategory ?? "all"}
          onValueChange={(value) =>
            updateFilters({ category: value === "all" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="__none__">No Category</SelectItem>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Status</p>
        <Select
          value={currentStatus ?? "all"}
          onValueChange={(value) => updateFilters({ status: value === "all" ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setSearchValue("");
          updateFilters({
            brand: null,
            category: null,
            status: null,
            search: null,
            page: null,
          });
        }}
      >
        Clear
      </Button>
    </div>
  );
}
