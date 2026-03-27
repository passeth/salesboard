"use client";

import {
  bulkUpdateProductBrand,
  bulkUpdateProductCategory,
  bulkUpdateProductStatus,
} from "@/app/(dashboard)/admin/products/_actions/product-update-actions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ProductRow } from "@/types/database";
import { OnChangeFn, RowSelectionState, SortingState } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { getProductsColumns } from "./products-columns";

const PRODUCT_CATEGORIES = ["Skin", "Body", "Hair", "Perfume", "Other"] as const;

type ProductsTableProps = {
  products: ProductRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSort?: string;
  currentSortDir?: string;
  brands: string[];
};

export function ProductsTable({
  products,
  totalCount,
  currentPage,
  pageSize,
  currentSort,
  currentSortDir,
  brands,
}: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tableProducts, setTableProducts] = useState(products);
  const [isPending, startTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedBrand, setSelectedBrand] = useState("");
  const [newBrandInput, setNewBrandInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const productsRef = useRef(products);
  const lastClickedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setTableProducts(products);
    productsRef.current = products;
  }, [products]);

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

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((index) => tableProducts[Number(index)]?.id)
      .filter(Boolean) as string[];
  }, [rowSelection, tableProducts]);

  const handleBulkStatus = useCallback(
    (status: "active" | "inactive") => {
      if (selectedIds.length === 0) return;

      startTransition(async () => {
        const result = await bulkUpdateProductStatus(selectedIds, status);
        if (result?.error) {
          alert(result.error);
          return;
        }
        setRowSelection({});
        router.refresh();
      });
    },
    [selectedIds, router],
  );

  const handleBulkCategory = useCallback(() => {
    if (selectedIds.length === 0 || !selectedCategory) return;

    startTransition(async () => {
      const result = await bulkUpdateProductCategory(selectedIds, selectedCategory);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setRowSelection({});
      setSelectedCategory("");
      router.refresh();
    });
  }, [selectedIds, selectedCategory, router]);

  const handleBulkBrand = useCallback(() => {
    const brandToApply = newBrandInput.trim() || selectedBrand;
    if (selectedIds.length === 0 || !brandToApply) return;

    startTransition(async () => {
      const result = await bulkUpdateProductBrand(selectedIds, brandToApply);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setRowSelection({});
      setSelectedBrand("");
      setNewBrandInput("");
      router.refresh();
    });
  }, [selectedIds, selectedBrand, newBrandInput, router]);

  const handleRowCheckboxClick = useCallback(
    (rowIndex: number, shiftKey: boolean) => {
      if (shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, rowIndex);
        const end = Math.max(lastClickedIndexRef.current, rowIndex);
        setRowSelection((prev) => {
          const next = { ...prev };
          for (let i = start; i <= end; i++) {
            next[i] = true;
          }
          return next;
        });
      } else {
        setRowSelection((prev) => ({
          ...prev,
          [rowIndex]: !prev[rowIndex],
        }));
      }
      lastClickedIndexRef.current = rowIndex;
    },
    [],
  );

  const columns = useMemo(
    () => getProductsColumns({ onRowCheckboxClick: handleRowCheckboxClick }),
    [handleRowCheckboxClick],
  );

  if (tableProducts.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        description="Try adjusting your filters or search."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.length}개 선택됨
          </span>

          <div className="h-4 w-px bg-border" />

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkStatus("active")}
            disabled={isPending}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkStatus("inactive")}
            disabled={isPending}
          >
            Inactive
          </Button>

          <div className="h-4 w-px bg-border" />

          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={selectedBrand}
            onChange={(e) => { setSelectedBrand(e.target.value); setNewBrandInput(""); }}
            disabled={!!newBrandInput.trim()}
          >
            <option value="">브랜드 선택...</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">또는</span>
          <input
            type="text"
            placeholder="새 브랜드 입력"
            value={newBrandInput}
            onChange={(e) => { setNewBrandInput(e.target.value); setSelectedBrand(""); }}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm w-32 uppercase"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkBrand}
            disabled={isPending || (!selectedBrand && !newBrandInput.trim())}
          >
            브랜드 적용
          </Button>

          <div className="h-4 w-px bg-border" />

          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">카테고리 선택...</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkCategory}
            disabled={isPending || !selectedCategory}
          >
            카테고리 적용
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={tableProducts}
        page={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        loading={isPending}
        onPageChange={updatePage}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onRowClick={(row) => router.push(`/catalog/${row.id}`)}
        tableClassName="[&_td]:whitespace-normal [&_td]:break-words"
        emptyTitle="No products found"
        emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
