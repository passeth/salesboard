"use client";

import {
  createShipTo,
  deleteShipTo,
  updateShipTo,
} from "@/app/(dashboard)/buyer/_actions/ship-to-actions";
import { EmptyState } from "@/components/empty-state";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import type { ShipToWithContact } from "@/types";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type ShipToManagerProps = {
  initialData: ShipToWithContact[];
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

const DEFAULT_FORM_STATE: FormState = {
  name: "",
  code: "",
  countryCode: "",
  status: "active",
  consigneeName: "",
  address: "",
  tel: "",
  fax: "",
  email: "",
};

export function ShipToManager({ initialData }: ShipToManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipTo, setEditingShipTo] = useState<ShipToWithContact | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

  const openCreateDialog = () => {
    setEditingShipTo(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsDialogOpen(true);
  };

  const openEditDialog = (shipTo: ShipToWithContact) => {
    setEditingShipTo(shipTo);
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
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isPending) return;
    setIsDialogOpen(false);
    setEditingShipTo(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = formState.name.trim();
    if (!trimmedName) return;

    const payload = {
      name: trimmedName,
      code: formState.code.trim() || undefined,
      country_code: formState.countryCode.trim() || undefined,
      consignee_name: formState.consigneeName.trim() || undefined,
      address: formState.address.trim() || undefined,
      tel: formState.tel.trim() || undefined,
      fax: formState.fax.trim() || undefined,
      email: formState.email.trim() || undefined,
    };

    startTransition(async () => {
      if (editingShipTo) {
        await updateShipTo({
          id: editingShipTo.id,
          ...payload,
          status: formState.status,
        });
      } else {
        await createShipTo(payload);
      }

      setIsDialogOpen(false);
      setEditingShipTo(null);
      setFormState(DEFAULT_FORM_STATE);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteShipTo(id);
      router.refresh();
    });
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{initialData.length} locations</p>
        <Button type="button" onClick={openCreateDialog} disabled={isPending}>
          <Plus className="size-4" />
          Add Ship-to
        </Button>
      </div>

      {initialData.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={MapPin}
            title="No ship-to locations"
            description="Add your first delivery destination to start placing orders."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={openCreateDialog} disabled={isPending}>
              <Plus className="size-4" />
              Add Ship-to
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((shipTo) => (
                <TableRow key={shipTo.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <p className="text-sm font-medium">{shipTo.name}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm text-muted-foreground">{shipTo.code ?? "-"}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {shipTo.country_code ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {shipTo.consignee_contact ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{shipTo.consignee_contact.name}</span>
                        {shipTo.consignee_contact.address && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {shipTo.consignee_contact.address}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {shipTo.consignee_contact ? (
                      <div className="flex flex-col gap-0.5">
                        {shipTo.consignee_contact.tel && (
                          <span className="text-xs text-muted-foreground">{shipTo.consignee_contact.tel}</span>
                        )}
                        {shipTo.consignee_contact.email && (
                          <span className="text-xs text-muted-foreground">{shipTo.consignee_contact.email}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
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
                        disabled={isPending}
                        onClick={() => openEditDialog(shipTo)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm" disabled={isPending}>
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete ship-to location?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. {shipTo.name} will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleDelete(shipTo.id)}
                            >
                              {isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingShipTo ? "Edit Ship-to" : "Add Ship-to"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ship-to-name">Name *</Label>
                  <Input
                    id="ship-to-name"
                    value={formState.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Warehouse name"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ship-to-code">Code</Label>
                  <Input
                    id="ship-to-code"
                    value={formState.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    placeholder="Optional code"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ship-to-country-code">Country Code</Label>
                  <Input
                    id="ship-to-country-code"
                    value={formState.countryCode}
                    onChange={(e) => updateField("countryCode", e.target.value)}
                    placeholder="e.g. KR"
                    disabled={isPending}
                  />
                </div>
                {editingShipTo && (
                  <div className="grid gap-2">
                    <Label htmlFor="ship-to-status">Status</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(value: "active" | "inactive") => updateField("status", value)}
                      disabled={isPending}
                    >
                      <SelectTrigger id="ship-to-status" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Consignee Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="consignee-name">Consignee Name</Label>
                  <Input
                    id="consignee-name"
                    value={formState.consigneeName}
                    onChange={(e) => updateField("consigneeName", e.target.value)}
                    placeholder="Company / Person name"
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="consignee-email">Email</Label>
                  <Input
                    id="consignee-email"
                    type="email"
                    value={formState.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="consignee@example.com"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="consignee-address">Address</Label>
                <Textarea
                  id="consignee-address"
                  value={formState.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Full shipping address"
                  rows={2}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="consignee-tel">Tel</Label>
                  <Input
                    id="consignee-tel"
                    value={formState.tel}
                    onChange={(e) => updateField("tel", e.target.value)}
                    placeholder="+7-XXX-XXX-XXXX"
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="consignee-fax">Fax</Label>
                  <Input
                    id="consignee-fax"
                    value={formState.fax}
                    onChange={(e) => updateField("fax", e.target.value)}
                    placeholder="+7-XXX-XXX-XXXX"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !formState.name.trim()}>
                {isPending
                  ? editingShipTo
                    ? "Saving..."
                    : "Creating..."
                  : editingShipTo
                    ? "Save Changes"
                    : "Create Ship-to"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
