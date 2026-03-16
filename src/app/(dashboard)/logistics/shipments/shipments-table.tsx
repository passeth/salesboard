"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ShipmentWithOrder } from "@/lib/queries/shipments";
import { OnChangeFn, SortingState } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { shipmentsColumns } from "./shipments-columns";

type ShipmentsTableProps = {
  shipments: ShipmentWithOrder[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSort?: string;
  currentSortDir?: string;
};

export function ShipmentsTable({
  shipments,
  totalCount,
  currentPage,
  pageSize,
  currentSort,
  currentSortDir,
}: ShipmentsTableProps) {
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

  if (shipments.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No shipments found"
        description="No shipment has been created yet. Start pallet planning from confirmed orders and return here after shipments are created."
        action={{ label: "Open Draft Planner", href: "/logistics/packing" }}
      />
    );
  }

  return (
    <DataTable
      columns={shipmentsColumns}
      data={shipments}
      page={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={updatePage}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      onRowClick={(row) => router.push(`/logistics/shipments/${row.id}`)}
      emptyTitle="No shipments found"
      emptyDescription="No shipment has been created yet. Start pallet planning from confirmed orders and return here after shipments are created."
    />
  );
}
