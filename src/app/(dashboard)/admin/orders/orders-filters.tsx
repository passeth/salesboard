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
import { ORDER_STATUS_CONFIG, OrderStatus } from "@/types";
import { OrganizationRow } from "@/types/database";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OrdersFiltersProps = {
  buyerOrganizations: Array<Pick<OrganizationRow, "id" | "name" | "code">>;
  currentStatus?: string;
  currentOrgId?: string;
  currentFromDate?: string;
  currentToDate?: string;
  currentSearch?: string;
};

export function OrdersFilters({
  buyerOrganizations,
  currentStatus,
  currentOrgId,
  currentFromDate,
  currentToDate,
  currentSearch,
}: OrdersFiltersProps) {
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
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_220px_240px_1fr_1fr_auto] md:items-end">
      <div className="space-y-2">
        <p className="text-sm font-medium">Search</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search order number..."
            className="pl-9"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
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
            {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Buyer</p>
        <Select
          value={currentOrgId ?? "all"}
          onValueChange={(value) => updateFilters({ orgId: value === "all" ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Buyers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buyers</SelectItem>
            {buyerOrganizations.map((organization) => (
              <SelectItem key={organization.id} value={organization.id}>
                {organization.code
                  ? `${organization.name} (${organization.code})`
                  : organization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">From date</p>
        <Input
          type="date"
          value={currentFromDate ?? ""}
          onChange={(event) => updateFilters({ fromDate: event.target.value || null })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">To date</p>
        <Input
          type="date"
          value={currentToDate ?? ""}
          onChange={(event) => updateFilters({ toDate: event.target.value || null })}
        />
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setSearchValue("");
          updateFilters({
            status: null,
            orgId: null,
            fromDate: null,
            toDate: null,
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
