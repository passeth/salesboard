"use client";

import {
  adminAssignShipToBuyer,
  adminDeleteShipTo,
  adminUpdateShipTo,
} from "@/app/(dashboard)/admin/shipping/_actions/shipping-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import type { ContactRow, OrganizationRow } from "@/types";
import { Check, ChevronDown, ChevronRight, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type ShipToWithParentAndContact = OrganizationRow & {
  parent: { id: string; name: string; code: string | null; org_type: string } | null;
  consignee_contact: ContactRow | null;
};

type BuyerOption = Pick<OrganizationRow, "id" | "name" | "code" | "org_type">;

type AdminShippingTableProps = {
  initialData: ShipToWithParentAndContact[];
  buyers: BuyerOption[];
};

type FormState = {
  name: string;
  code: string;
  countryCode: string;
  status: "active" | "inactive";
  consigneeName: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
};

type BuyerGroup = {
  buyerId: string;
  buyerName: string;
  shipTos: ShipToWithParentAndContact[];
};

export function AdminShippingTable({ initialData, buyers }: AdminShippingTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [buyerFilter, setBuyerFilter] = useState<string>("all");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [collapsedBuyers, setCollapsedBuyers] = useState<Set<string>>(new Set());
  const [selectedShipTos, setSelectedShipTos] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignBuyerId, setAssignBuyerId] = useState<string>("");
  const [formState, setFormState] = useState<FormState>({
    name: "",
    code: "",
    countryCode: "",
    status: "active",
    consigneeName: "",
    address: "",
    tel: "",
    fax: "",
    email: "",
  });

  const filtered = useMemo(() => {
    let result = initialData;
    if (buyerFilter !== "all") {
      result = result.filter((s) => s.parent?.id === buyerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.parent?.name.toLowerCase().includes(q) ||
          s.consignee_contact?.name.toLowerCase().includes(q) ||
          s.consignee_contact?.address?.toLowerCase().includes(q) ||
          s.country_code?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [initialData, search, buyerFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, BuyerGroup>();
    for (const shipTo of filtered) {
      const buyerId = shipTo.parent?.id ?? "unknown";
      const buyerName = shipTo.parent?.name ?? "Unknown Buyer";
      if (!map.has(buyerId)) {
        map.set(buyerId, { buyerId, buyerName, shipTos: [] });
      }
      map.get(buyerId)!.shipTos.push(shipTo);
    }
    return Array.from(map.values()).sort((a, b) => a.buyerName.localeCompare(b.buyerName));
  }, [filtered]);

  const toggleBuyer = (buyerId: string) => {
    setCollapsedBuyers((prev) => {
      const next = new Set(prev);
      if (next.has(buyerId)) {
        next.delete(buyerId);
      } else {
        next.add(buyerId);
      }
      return next;
    });
  };

  const startEditing = (shipTo: ShipToWithParentAndContact) => {
    setEditingRowId(shipTo.id);
    setFormState({
      name: shipTo.name,
      code: shipTo.code ?? "",
      countryCode: shipTo.country_code ?? "",
      status: shipTo.status,
      consigneeName: shipTo.consignee_contact?.name ?? "",
      address: shipTo.consignee_contact?.address ?? "",
      tel: shipTo.consignee_contact?.tel ?? "",
      fax: shipTo.consignee_contact?.fax ?? "",
      email: shipTo.consignee_contact?.email ?? "",
    });
  };

  const cancelEditing = () => {
    if (isPending) return;
    setEditingRowId(null);
  };

  const saveEditing = () => {
    if (!editingRowId || !formState.name.trim()) return;

    startTransition(async () => {
      await adminUpdateShipTo({
        id: editingRowId,
        name: formState.name.trim() || undefined,
        code: formState.code.trim() || undefined,
        country_code: formState.countryCode.trim() || undefined,
        status: formState.status,
        consignee_name: formState.consigneeName.trim() || undefined,
        address: formState.address.trim() || undefined,
        tel: formState.tel.trim() || undefined,
        fax: formState.fax.trim() || undefined,
        email: formState.email.trim() || undefined,
      });

      setEditingRowId(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await adminDeleteShipTo(id);
      router.refresh();
    });
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const isEditing = (id: string) => editingRowId === id;

  const toggleShipToSelection = (id: string) => {
    setSelectedShipTos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInGroup = (shipTos: ShipToWithParentAndContact[]) => {
    setSelectedShipTos((prev) => {
      const next = new Set(prev);
      const allSelected = shipTos.every((s) => prev.has(s.id));
      if (allSelected) {
        shipTos.forEach((s) => next.delete(s.id));
      } else {
        shipTos.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleAssign = () => {
    if (!assignBuyerId || selectedShipTos.size === 0) return;
    startTransition(async () => {
      await adminAssignShipToBuyer(Array.from(selectedShipTos), assignBuyerId);
      setSelectedShipTos(new Set());
      setAssignDialogOpen(false);
      setAssignBuyerId("");
      router.refresh();
    });
  };

  const totalShipTos = filtered.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, buyer, consignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={buyerFilter} onValueChange={setBuyerFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Buyers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buyers</SelectItem>
            {buyers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground ml-auto">
          {grouped.length} buyers · {totalShipTos} locations
        </p>
      </div>

      {selectedShipTos.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-sm font-medium">{selectedShipTos.size} selected</span>
          <Button
            size="sm"
            onClick={() => {
              setAssignBuyerId("");
              setAssignDialogOpen(true);
            }}
            disabled={isPending}
          >
            <UserPlus className="size-4" />
            Assign to Buyer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedShipTos(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ship-to Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Consignee</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Tel</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {search ? "No matching ship-to locations" : "No ship-to locations found"}
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((group) => {
                const isCollapsed = collapsedBuyers.has(group.buyerId);
                return (
                  <BuyerGroupRows
                    key={group.buyerId}
                    group={group}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleBuyer(group.buyerId)}
                    isEditing={isEditing}
                    editingRowId={editingRowId}
                    formState={formState}
                    isPending={isPending}
                    onStartEditing={startEditing}
                    onCancelEditing={cancelEditing}
                    onSaveEditing={saveEditing}
                    onDelete={handleDelete}
                    onUpdateField={updateField}
                    selectedShipTos={selectedShipTos}
                    onToggleSelection={toggleShipToSelection}
                    onToggleGroupSelection={toggleAllInGroup}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {selectedShipTos.size} ship-to location(s) to buyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={assignBuyerId} onValueChange={setAssignBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target buyer..." />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Selected locations will be moved under the chosen buyer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignBuyerId || isPending}
            >
              {isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type BuyerGroupRowsProps = {
  group: BuyerGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  isEditing: (id: string) => boolean;
  editingRowId: string | null;
  formState: FormState;
  isPending: boolean;
  onStartEditing: (shipTo: ShipToWithParentAndContact) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onDelete: (id: string) => void;
  onUpdateField: (field: keyof FormState, value: string) => void;
  selectedShipTos: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleGroupSelection: (shipTos: ShipToWithParentAndContact[]) => void;
};

function BuyerGroupRows({
  group,
  isCollapsed,
  onToggle,
  isEditing,
  editingRowId,
  formState,
  isPending,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onDelete,
  onUpdateField,
  selectedShipTos,
  onToggleSelection,
  onToggleGroupSelection,
}: BuyerGroupRowsProps) {
  const allSelected = group.shipTos.length > 0 && group.shipTos.every((s) => selectedShipTos.has(s.id));
  const someSelected = group.shipTos.some((s) => selectedShipTos.has(s.id));

  return (
    <>
      {/* Buyer header row */}
      <TableRow
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
      >
        <TableCell colSpan={9}>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onToggleGroupSelection(group.shipTos)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select all ${group.buyerName} ship-to locations`}
            />
            <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
              {isCollapsed ? (
                <ChevronRight className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-sm">{group.buyerName}</span>
              <Badge variant="secondary" className="text-xs">
                {group.shipTos.length}
              </Badge>
            </div>
          </div>
        </TableCell>
      </TableRow>

      {/* Ship-to rows */}
      {!isCollapsed &&
        group.shipTos.map((shipTo) =>
          isEditing(shipTo.id) ? (
            <TableRow key={shipTo.id} className="bg-muted/30">
              <TableCell>
                <Input
                  value={formState.name}
                  onChange={(e) => onUpdateField("name", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.code}
                  onChange={(e) => onUpdateField("code", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm w-24"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.countryCode}
                  onChange={(e) => onUpdateField("countryCode", e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. RU"
                  className="h-8 text-sm w-16"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.consigneeName}
                  onChange={(e) => onUpdateField("consigneeName", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.address}
                  onChange={(e) => onUpdateField("address", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.tel}
                  onChange={(e) => onUpdateField("tel", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm w-28"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={formState.email}
                  onChange={(e) => onUpdateField("email", e.target.value)}
                  disabled={isPending}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={formState.status}
                  onValueChange={(value: "active" | "inactive") => onUpdateField("status", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={isPending || !formState.name.trim()}
                    onClick={onSaveEditing}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={onCancelEditing}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow key={shipTo.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedShipTos.has(shipTo.id)}
                    onCheckedChange={() => onToggleSelection(shipTo.id)}
                    aria-label={`Select ${shipTo.name}`}
                  />
                  <span className="text-sm font-medium">{shipTo.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-muted-foreground">{shipTo.code ?? "-"}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-muted-foreground">{shipTo.country_code ?? "-"}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{shipTo.consignee_contact?.name ?? "-"}</span>
              </TableCell>
              <TableCell>
                {shipTo.consignee_contact?.address ? (
                  <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                    {shipTo.consignee_contact.address}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">{shipTo.consignee_contact?.tel ?? "-"}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">{shipTo.consignee_contact?.email ?? "-"}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={shipTo.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"}
                >
                  {shipTo.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending || editingRowId !== null}
                    onClick={() => onStartEditing(shipTo)}
                  >
                    <Pencil className="size-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" disabled={isPending || editingRowId !== null}>
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete ship-to location?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. {shipTo.name} ({shipTo.parent?.name}) will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => onDelete(shipTo.id)}
                        >
                          {isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ),
        )}
    </>
  );
}
