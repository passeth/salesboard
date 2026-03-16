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
import { LayoutGrid, List, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface CatalogFiltersProps {
  brands: string[];
  categories: string[];
  currentBrand?: string;
  currentCategory?: string;
  currentSearch?: string;
  currentView: "grid" | "list";
}

export function CatalogFilters({
  brands,
  categories,
  currentBrand,
  currentCategory,
  currentSearch,
  currentView,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(currentSearch || "");

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (!("view" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (currentSearch || "")) {
        updateFilters({ q: searchValue || null });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateFilters]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-9"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <Select
          value={currentBrand || "all"}
          onValueChange={(value) =>
            updateFilters({ brand: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
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

        <Select
          value={currentCategory || "all"}
          onValueChange={(value) =>
            updateFilters({ category: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border">
        <Button
          variant={currentView === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => updateFilters({ view: "grid" })}
          title="Grid View"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={currentView === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => updateFilters({ view: "list" })}
          title="List View"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
