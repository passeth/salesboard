"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserWithOrg } from "@/lib/queries/admin";
import { UserRole } from "@/types";
import { OnChangeFn, SortingState } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { usersColumns } from "./users-columns";

type UsersTableProps = {
  users: UserWithOrg[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentRole?: string;
  currentStatus?: string;
  currentSort?: string;
  currentSortDir?: string;
};

const USER_STATUSES = ["active", "inactive", "invited"] as const;

function getRoleLabel(role: UserRole) {
  switch (role) {
    case UserRole.Buyer:
      return "Buyer";
    case UserRole.Vendor:
      return "Vendor";
    case UserRole.Sales:
      return "Sales";
    case UserRole.Logistics:
      return "Logistics";
    case UserRole.Admin:
      return "Admin";
    default:
      return role;
  }
}

export function UsersTable({
  users,
  totalCount,
  currentPage,
  pageSize,
  currentRole,
  currentStatus,
  currentSort,
  currentSortDir,
}: UsersTableProps) {
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
      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[220px_220px_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Role</p>
          <Select
            value={currentRole ?? "all"}
            onValueChange={(value) => updateFilters({ role: value === "all" ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.values(UserRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {getRoleLabel(role)}
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
              {USER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            updateFilters({
              role: null,
              status: null,
              page: null,
            })
          }
        >
          Clear
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your filters." />
      ) : (
        <DataTable
          columns={usersColumns}
          data={users}
          page={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={updatePage}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          emptyTitle="No users found"
          emptyDescription="Try adjusting your filters."
        />
      )}
    </div>
  );
}
