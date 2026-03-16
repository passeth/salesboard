"use client";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LogisticsPackingListOrder } from "@/lib/queries/orders";
import { Boxes } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { packingColumns } from "./packing-columns";

type PackingTableProps = {
  orders: LogisticsPackingListOrder[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

export function PackingTable({
  orders,
  totalCount,
  currentPage,
  pageSize,
}: PackingTableProps) {
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
        icon={Boxes}
        title="No eligible orders found"
        description="Packing simulation is available for confirmed or shipped orders."
      />
    );
  }

  return (
    <DataTable
      columns={packingColumns}
      data={orders}
      page={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={updatePage}
      onRowClick={(row) => router.push(`/logistics/packing/${row.id}`)}
      emptyTitle="No eligible orders found"
      emptyDescription="Packing simulation is available for confirmed or shipped orders."
    />
  );
}
