"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LogisticsPackingListOrder } from "@/lib/queries/orders";
import { FileText } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { packingListColumns } from "./packing-list-columns";

type PackingListTableProps = {
  orders: LogisticsPackingListOrder[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

export function PackingListTable({
  orders,
  totalCount,
  currentPage,
  pageSize,
}: PackingListTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No eligible orders found"
        description="Packing lists are available for confirmed or shipped orders."
      />
    );
  }

  return (
      <DataTable
      columns={packingListColumns}
      data={orders}
      page={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={updatePage}
      onRowClick={(row) => router.push(`/logistics/packing-list/${row.id}`)}
      emptyTitle="No eligible orders found"
      emptyDescription="Packing lists are available for confirmed or shipped orders."
    />
  );
}
