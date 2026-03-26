"use client";

import { adminBulkAssignVendor } from "@/app/(dashboard)/admin/organizations/_actions/assignment-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link2, Search, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { BuyerRow } from "./buyers-tab";

export type VendorRow = {
  id: string;
  name: string;
  code: string | null;
  assigned_buyer_count: number;
};

type VendorsTabProps = {
  vendors: VendorRow[];
  buyers: BuyerRow[];
};

export function VendorsTab({ vendors, buyers }: VendorsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<Set<string>>(new Set());
  const [buyerSearch, setBuyerSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || v.code?.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const buyersByVendor = useMemo(() => {
    const map = new Map<string, BuyerRow[]>();
    for (const v of vendors) {
      map.set(v.id, buyers.filter((b) => b.vendor_name === v.name));
    }
    return map;
  }, [vendors, buyers]);

  const unassignedBuyers = useMemo(() => {
    return buyers.filter((b) => !b.vendor_name);
  }, [buyers]);

  const filteredBuyersForAssign = useMemo(() => {
    const all = [...unassignedBuyers, ...buyers.filter((b) => b.vendor_name)];
    if (!buyerSearch.trim()) return all;
    const q = buyerSearch.toLowerCase();
    return all.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q),
    );
  }, [buyers, unassignedBuyers, buyerSearch]);

  const openAssignDialog = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    const currentBuyerIds = new Set(
      buyers
        .filter((b) => b.vendor_name === vendors.find((v) => v.id === vendorId)?.name)
        .map((b) => b.id),
    );
    setSelectedBuyerIds(currentBuyerIds);
    setBuyerSearch("");
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedVendorId) return;
    const vendorName = vendors.find((v) => v.id === selectedVendorId)?.name;
    const currentlyAssigned = new Set(
      buyers.filter((b) => b.vendor_name === vendorName).map((b) => b.id),
    );

    const toAssign = Array.from(selectedBuyerIds).filter((id) => !currentlyAssigned.has(id));
    const toUnassign = Array.from(currentlyAssigned).filter((id) => !selectedBuyerIds.has(id));

    startTransition(async () => {
      if (toAssign.length > 0) {
        await adminBulkAssignVendor(toAssign, selectedVendorId);
      }
      if (toUnassign.length > 0) {
        await adminBulkAssignVendor(toUnassign, null);
      }
      setAssignDialogOpen(false);
      setSelectedVendorId(null);
      router.refresh();
    });
  };

  const toggleBuyer = (id: string) => {
    const next = new Set(selectedBuyerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBuyerIds(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="벤더 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length}개 벤더</span>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>벤더명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>담당 바이어</TableHead>
              <TableHead className="w-32">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  벤더가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.code ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(buyersByVendor.get(v.id) ?? []).length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        (buyersByVendor.get(v.id) ?? []).map((b) => (
                          <Badge key={b.id} variant="secondary" className="text-xs">
                            {b.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignDialog(v.id)}
                    >
                      <Link2 className="size-4" />
                      바이어 매칭
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {unassignedBuyers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1">
            <Unlink className="size-4" />
            벤더 미배정 바이어 ({unassignedBuyers.length})
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>바이어명</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>국가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedBuyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.code ?? "-"}</TableCell>
                    <TableCell>{b.country_name ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              바이어 매칭 — {vendors.find((v) => v.id === selectedVendorId)?.name}
            </DialogTitle>
            <DialogDescription>
              이 벤더에 담당할 바이어를 선택하세요. 체크 해제 시 매칭이 해제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="바이어 검색..."
              value={buyerSearch}
              onChange={(e) => setBuyerSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredBuyersForAssign.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedBuyerIds.has(b.id)}
                    onCheckedChange={() => toggleBuyer(b.id)}
                  />
                  <span className="text-sm">{b.name}</span>
                  {b.code && <span className="text-xs text-muted-foreground">({b.code})</span>}
                  {b.vendor_name && b.vendor_name !== vendors.find((v) => v.id === selectedVendorId)?.name && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      현재: {b.vendor_name}
                    </Badge>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedBuyerIds.size}개 바이어 선택됨
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleAssign} disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
