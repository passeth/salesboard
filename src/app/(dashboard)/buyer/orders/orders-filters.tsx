"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { BUYER_STATUS_TABS } from "./buyer-status-tabs";

type OrdersFiltersProps = {
  currentTab?: string;
  currentFromDate?: string;
  currentToDate?: string;
  tabCounts?: Record<string, number>;
};

export function OrdersFilters({
  currentTab,
  currentFromDate,
  currentToDate,
  tabCounts,
}: OrdersFiltersProps) {
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

  const activeTab = currentTab || "all";

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          updateFilters({ tab: value === "all" ? null : value, status: null })
        }
      >
        <TabsList className="w-full justify-start">
          {BUYER_STATUS_TABS.map((tab) => {
            const count = tabCounts?.[tab.key];
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                {tab.label}
                {count != null && count > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium">From date</p>
          <Input
            type="date"
            value={currentFromDate ?? ""}
            onChange={(event) =>
              updateFilters({ fromDate: event.target.value || null })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">To date</p>
          <Input
            type="date"
            value={currentToDate ?? ""}
            onChange={(event) =>
              updateFilters({ toDate: event.target.value || null })
            }
          />
        </div>

        <Button
          variant="outline"
          onClick={() =>
            updateFilters({
              tab: null,
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
    </div>
  );
}
