"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { VendorAccountSummary } from "@/lib/queries/vendor";
import { SortingState } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { vendorAccountsColumns } from "./vendor-accounts-columns";

type VendorAccountsTableProps = {
  accounts: VendorAccountSummary[];
};

export function VendorAccountsTable({ accounts }: VendorAccountsTableProps) {
  const [page] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const sortedAccounts = useMemo(() => {
    if (sorting.length === 0) return accounts;
    const { id, desc } = sorting[0];
    return [...accounts].sort((a, b) => {
      const aVal = a[id as keyof VendorAccountSummary];
      const bVal = b[id as keyof VendorAccountSummary];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return desc ? bVal - aVal : aVal - bVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return desc ? -cmp : cmp;
    });
  }, [accounts, sorting]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No accounts found"
        description="No buyer accounts have been assigned to you yet."
      />
    );
  }

  return (
    <DataTable
      columns={vendorAccountsColumns}
      data={sortedAccounts}
      page={page}
      pageSize={100}
      totalCount={accounts.length}
      sorting={sorting}
      onSortingChange={setSorting}
      onPageChange={() => {}}
      emptyTitle="No accounts found"
      emptyDescription="No buyer accounts have been assigned to you yet."
    />
  );
}
