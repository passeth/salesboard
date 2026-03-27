"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { adminCreateUser } from "./_actions/user-actions";
import { usersColumns } from "./users-columns";

type OrgOption = { id: string; name: string };

type UsersTableProps = {
  users: UserWithOrg[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentRole?: string;
  currentStatus?: string;
  currentSort?: string;
  currentSortDir?: string;
  orgOptions: OrgOption[];
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
  orgOptions,
}: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateUser = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await adminCreateUser({
          email: formData.get("email") as string,
          password: formData.get("password") as string,
          name: formData.get("name") as string,
          role: formData.get("role") as string,
          org_id: formData.get("org_id") as string,
          phone: (formData.get("phone") as string) || undefined,
        });
        setCreateOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create user");
      }
    });
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

        <div className="flex gap-2">
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

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
              </DialogHeader>
              <form action={handleCreateUser} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required defaultValue={UserRole.Buyer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org_id">Organization</Label>
                  <Select name="org_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgOptions.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" name="phone" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
