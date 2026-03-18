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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type SalesAccountsFiltersProps = {
  currentSearch?: string;
  currentCountry?: string;
  currentHasVendor?: string;
  countries: string[];
};

export function SalesAccountsFilters({
  currentSearch,
  currentCountry,
  currentHasVendor,
  countries,
}: SalesAccountsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
      <div className="space-y-2">
        <p className="text-sm font-medium">Search</p>
        <Input
          placeholder="Search by name or code..."
          value={currentSearch ?? ""}
          onChange={(e) => updateFilters({ search: e.target.value || null })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Country</p>
        <Select
          value={currentCountry ?? "all"}
          onValueChange={(value) =>
            updateFilters({ country: value === "all" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Channel</p>
        <Select
          value={currentHasVendor ?? "all"}
          onValueChange={(value) =>
            updateFilters({ hasVendor: value === "all" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="no">Direct Only</SelectItem>
            <SelectItem value="yes">Via Vendor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        onClick={() =>
          updateFilters({
            search: null,
            country: null,
            hasVendor: null,
          })
        }
      >
        Clear
      </Button>
    </div>
  );
}
