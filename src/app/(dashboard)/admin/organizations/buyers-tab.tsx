"use client";

import {
  adminChangeParent,
  adminMergeBuyers,
  type MergeResult,
} from "@/app/(dashboard)/admin/organizations/_actions/organizations-actions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GitMerge, MoveRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type BuyerRow = {
  id: string;
  name: string;
  code: string | null;
  country_name: string | null;
  ship_to_count: number;
  vendor_name: string | null;
  sales_user_name: string | null;
  status: string;
};

type AllOrgOption = {
  id: string;
  name: string;
  code: string | null;
  org_type: string;
};

type BuyersTabProps = {
  buyers: BuyerRow[];
  allOrgs: AllOrgOption[];
};

export function BuyersTab({ buyers, allOrgs }: BuyersTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [parentTargetId, setParentTargetId] = useState("");
  const [parentSearch, setParentSearch] = useState("");

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return buyers;
    const q = search.toLowerCase();
    return buyers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.country_name?.toLowerCase().includes(q),
    );
  }, [buyers, search]);

  const selectedBuyers = useMemo(
    () => buyers.filter((b) => selected.has(b.id)),
    [buyers, selected],
  );

  const filteredParentOrgs = useMemo(() => {
    let candidates = allOrgs.filter((o) => !selected.has(o.id));
    if (parentSearch.trim()) {
      const q = parentSearch.toLowerCase();
      candidates = candidates.filter(
        (o) => o.name.toLowerCase().includes(q) || o.code?.toLowerCase().includes(q),
      );
    }
    return candidates;
  }, [allOrgs, selected, parentSearch]);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((b) => b.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleChangeParent = () => {
    if (!parentTargetId || selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await adminChangeParent(ids, parentTargetId === "__none__" ? null : parentTargetId);
      setSelected(new Set());
      setParentDialogOpen(false);
      setParentTargetId("");
      setParentSearch("");
      router.refresh();
    });
  };

  const handleMergeBuyers = () => {
    if (!mergeTargetId || selectedBuyers.length < 2) return;
    const sourceIds = selectedBuyers.filter((b) => b.id !== mergeTargetId).map((b) => b.id);
    if (sourceIds.length === 0) return;
    startTransition(async () => {
      const result = await adminMergeBuyers(mergeTargetId, sourceIds);
      setMergeResult(result);
      setSelected(new Set());
      router.refresh();
    });
  };

  const ORG_TYPE_LABELS_SHORT: Record<string, string> = {
    internal: "Internal",
    vendor: "Vendor",
    buyer_company: "Buyer Company",
    buyer: "Sub-buyer",
    buyer_ship_to: "Ship-to",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="바이어 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length}개 바이어</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950 flex-wrap">
          <span className="text-sm font-medium">{selected.size}개 선택</span>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setParentTargetId("");
              setParentSearch("");
              setParentDialogOpen(true);
            }}
          >
            <MoveRight className="size-4" />
            상위 변경
          </Button>

          {selected.size >= 2 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setMergeTargetId("");
                setMergeResult(null);
                setMergeDialogOpen(true);
              }}
            >
              <GitMerge className="size-4" />
              바이어 병합 ({selected.size})
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            취소
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>바이어명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>국가</TableHead>
              <TableHead className="text-center">배송지</TableHead>
              <TableHead>벤더</TableHead>
              <TableHead>영업</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  바이어가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.code ?? "-"}</TableCell>
                  <TableCell>{b.country_name ?? "-"}</TableCell>
                  <TableCell className="text-center">{b.ship_to_count}</TableCell>
                  <TableCell>{b.vendor_name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{b.sales_user_name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "active" ? "default" : "secondary"} className="capitalize">
                      {b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected.size}개 바이어 상위 변경</DialogTitle>
            <DialogDescription>
              선택: {selectedBuyers.map((b) => b.name).join(", ")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="조직 검색..."
              value={parentSearch}
              onChange={(e) => setParentSearch(e.target.value)}
            />
            <Select value={parentTargetId} onValueChange={setParentTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="새 상위 조직 선택..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">상위 없음 (최상위)</span>
                </SelectItem>
                {filteredParentOrgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ORG_TYPE_LABELS_SHORT[o.org_type] ?? o.org_type}
                      </Badge>
                      {o.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentDialogOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleChangeParent} disabled={!parentTargetId || isPending}>
              {isPending ? "변경 중..." : "상위 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          setMergeDialogOpen(open);
          if (!open) setMergeResult(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mergeResult ? "병합 완료" : `${selectedBuyers.length}개 바이어 병합`}
            </DialogTitle>
            {!mergeResult && (
              <DialogDescription>
                다른 바이어의 배송지, 주문, 연락처 등 모든 데이터가 대상 바이어로 이동됩니다. 원본 바이어는 비활성화됩니다.
              </DialogDescription>
            )}
          </DialogHeader>

          {mergeResult ? (
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium text-emerald-700">병합이 완료되었습니다:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {mergeResult.ship_tos_moved > 0 && <li>배송지 {mergeResult.ship_tos_moved}개 이동</li>}
                {mergeResult.orders_moved > 0 && <li>주문 {mergeResult.orders_moved}개 이동</li>}
                {mergeResult.contacts_moved > 0 && <li>연락처 {mergeResult.contacts_moved}개 이동</li>}
                {mergeResult.users_moved > 0 && <li>사용자 {mergeResult.users_moved}명 이동</li>}
                {mergeResult.assignments_moved > 0 && <li>계정 할당 {mergeResult.assignments_moved}개 이동</li>}
                {mergeResult.prices_moved > 0 && <li>가격 {mergeResult.prices_moved}개 이동</li>}
                {mergeResult.supplied_moved > 0 && <li>공급 제품 {mergeResult.supplied_moved}개 이동</li>}
                {mergeResult.inquiries_moved > 0 && <li>문의 {mergeResult.inquiries_moved}개 이동</li>}
                <li className="font-medium">원본 바이어 {mergeResult.sources_deactivated}개 비활성화</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">대상 바이어 선택 (유지):</p>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="대상 바이어 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBuyers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mergeTargetId && (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">대상으로 병합:</p>
                  {selectedBuyers
                    .filter((b) => b.id !== mergeTargetId)
                    .map((b) => (
                      <p key={b.id} className="text-sm text-muted-foreground">
                        {b.name} {b.code ? `(${b.code})` : ""} → 비활성화
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {mergeResult ? (
              <Button onClick={() => { setMergeDialogOpen(false); setMergeResult(null); }}>
                확인
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMergeDialogOpen(false)} disabled={isPending}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleMergeBuyers}
                  disabled={!mergeTargetId || isPending}
                >
                  {isPending ? "병합 중..." : "병합"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
