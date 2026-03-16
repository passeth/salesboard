"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizationWithParent } from "@/lib/queries/admin";
import { OrgType } from "@/types";
import { OnChangeFn, SortingState } from "@tanstack/react-table";
import { Building2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { organizationsColumns } from "./organizations-columns";

type OrganizationsTableProps = {
  organizations: OrganizationWithParent[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentOrgType?: string;
  currentStatus?: string;
  currentSearch?: string;
  currentSort?: string;
  currentSortDir?: string;
};

const ORG_TYPES: OrgType[] = [
  "internal",
  "vendor",
  "buyer_country",
  "buyer_company",
  "buyer_ship_to",
];

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  internal: "Internal",
  vendor: "Vendor",
  buyer_country: "Buyer Country",
  buyer_company: "Buyer Company",
  buyer_ship_to: "Buyer Ship To",
};

const ORG_STATUSES = ["active", "inactive"] as const;

export function OrganizationsTable({
  organizations,
  totalCount,
  currentPage,
  pageSize,
  currentOrgType,
  currentStatus,
  currentSearch,
  currentSort,
  currentSortDir,
}: OrganizationsTableProps) {
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

  const updatePage = (nextPage: number) => {
    updateFilters({ page: String(nextPage) });
  };

  const sorting: SortingState = currentSort
    ? [{ id: currentSort, desc: currentSortDir !== "asc" }]
    : [];

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const next = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;

    if (next.length > 0) {
      updateFilters({
        sort: next[0].id,
        sortDir: next[0].desc ? "desc" : "asc",
        page: null,
      });
      return;
    }

    updateFilters({ sort: null, sortDir: null, page: null });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Search</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name or code..."
              className="pl-9"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Type</p>
          <Select
            value={currentOrgType ?? "all"}
            onValueChange={(value) => updateFilters({ org_type: value === "all" ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ORG_TYPES.map((orgType) => (
                <SelectItem key={orgType} value={orgType}>
                  {ORG_TYPE_LABELS[orgType]}
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
              {ORG_STATUSES.map((status) => (
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
              org_type: null,
              status: null,
              search: null,
              page: null,
            });
          }}
        >
          Clear
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">Total organizations: {totalCount}</p>

      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description="Try adjusting your filters or search."
        />
      ) : (
        <DataTable
          columns={organizationsColumns}
          data={organizations}
          page={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={updatePage}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          emptyTitle="No organizations found"
          emptyDescription="Try adjusting your filters."
        />
      )}
    </div>
  );
}
