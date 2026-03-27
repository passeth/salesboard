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

const COMMISSION_STATUSES = ["pending", "approved", "paid", "cancelled"] as const;

type VendorCommissionsFiltersProps = {
  currentStatus?: string;
  currentFromDate?: string;
  currentToDate?: string;
};

export function VendorCommissionsFilters({
  currentStatus,
  currentFromDate,
  currentToDate,
}: VendorCommissionsFiltersProps) {
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
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[220px_1fr_1fr_auto] md:items-end">
      <div className="space-y-2">
        <p className="text-sm font-medium">Status</p>
        <Select
          value={currentStatus ?? "all"}
          onValueChange={(value) =>
            updateFilters({ status: value === "all" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COMMISSION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
            status: null,
            fromDate: null,
            toDate: null,
            page: null,
          })
        }
      >
        Clear
      </Button>
    </div>
  );
}
