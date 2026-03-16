"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type InventorySearchProps = {
  currentSearch?: string;
};

export function InventorySearch({ currentSearch }: InventorySearchProps) {
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
      <div className="space-y-2">
        <p className="text-sm font-medium">Search</p>
        <div className="relative max-w-md">
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
    </div>
  );
}
