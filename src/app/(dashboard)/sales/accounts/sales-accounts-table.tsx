"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import type { SalesAccountSummary } from "@/types";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { salesAccountsColumns } from "./sales-accounts-columns";

type SalesAccountsTableProps = {
  accounts: SalesAccountSummary[];
};

export function SalesAccountsTable({ accounts }: SalesAccountsTableProps) {
  const router = useRouter();
  const [page] = useState(1);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No accounts found"
        description="Try adjusting your filters."
      />
    );
  }

  return (
    <DataTable
      columns={salesAccountsColumns}
      data={accounts}
      page={page}
      pageSize={100}
      totalCount={accounts.length}
      onPageChange={() => {}}
      onRowClick={(row) => router.push(`/sales/accounts/${row.org_id}`)}
      emptyTitle="No accounts found"
      emptyDescription="Try adjusting your filters."
    />
  );
}
