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
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { VendorOrderTab } from "./page";

const TABS: { value: VendorOrderTab; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "review", label: "Review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
];

type VendorOrdersFiltersProps = {
  currentTab: VendorOrderTab;
  currentBuyerOrg?: string;
  currentFromDate?: string;
  currentToDate?: string;
  buyerOrganizations: Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
};

export function VendorOrdersFilters({
  currentTab,
  currentBuyerOrg,
  currentFromDate,
  currentToDate,
  buyerOrganizations,
}: VendorOrdersFiltersProps) {
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

      if (!("page" in updates)) {
        params.delete("page");
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateFilters({ tab: tab.value === "submitted" ? null : tab.value })}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              currentTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[240px_1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Buyer Org</p>
          <Select
            value={currentBuyerOrg ?? "all"}
            onValueChange={(value) =>
              updateFilters({ buyerOrg: value === "all" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Buyers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              {buyerOrganizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.code ? `${organization.name} (${organization.code})` : organization.name}
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
          onClick={() =>
            updateFilters({
              tab: null,
              buyerOrg: null,
              fromDate: null,
              toDate: null,
              page: null,
            })
          }
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
