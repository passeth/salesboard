"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type InventorySearchProps = {
  currentSearch?: string;
  currentBrand?: string;
  brands?: string[];
};

export function InventorySearch({ currentSearch, currentBrand, brands = [] }: InventorySearchProps) {
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
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-end gap-4">
        <div className="space-y-2 flex-1 max-w-md">
          <p className="text-sm font-medium">Search</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search SKU, product name, brand..."
              className="pl-9"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 w-48">
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
      </div>
    </div>
  );
}
