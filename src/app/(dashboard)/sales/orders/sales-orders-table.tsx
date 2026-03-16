"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SalesOrderWithCounts } from "@/lib/queries/sales-orders";
import { OnChangeFn, SortingState } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { salesOrdersColumns } from "./sales-orders-columns";

type SalesOrdersTableProps = {
  orders: SalesOrderWithCounts[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSort?: string;
  currentSortDir?: string;
};

export function SalesOrdersTable({
  orders,
  totalCount,
  currentPage,
  pageSize,
  currentSort,
  currentSortDir,
}: SalesOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const sorting: SortingState = currentSort
    ? [{ id: currentSort, desc: currentSortDir !== "asc" }]
    : [];

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const next = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
    const params = new URLSearchParams(searchParams.toString());

    if (next.length > 0) {
      params.set("sort", next[0].id);
      params.set("sortDir", next[0].desc ? "desc" : "asc");
    } else {
      params.delete("sort");
      params.delete("sortDir");
    }

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders found"
        description="Try adjusting your filters."
      />
    );
  }

  return (
    <DataTable
      columns={salesOrdersColumns}
      data={orders}
      page={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={updatePage}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      onRowClick={(row) => router.push(`/sales/orders/${row.id}`)}
      emptyTitle="No orders found"
      emptyDescription="Try adjusting your filters."
    />
  );
}
