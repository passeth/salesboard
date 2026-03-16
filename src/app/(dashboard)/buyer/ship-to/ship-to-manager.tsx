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
import type { OrganizationRow } from "@/types";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type ShipToManagerProps = {
  initialData: OrganizationRow[];
};

type FormState = {
  name: string;
  code: string;
  countryCode: string;
  status: "active" | "inactive";
};

const DEFAULT_FORM_STATE: FormState = {
  name: "",
  code: "",
  countryCode: "",
  status: "active",
};

export function ShipToManager({ initialData }: ShipToManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipTo, setEditingShipTo] = useState<OrganizationRow | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

  const openCreateDialog = () => {
    setEditingShipTo(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsDialogOpen(true);
  };

  const openEditDialog = (shipTo: OrganizationRow) => {
    setEditingShipTo(shipTo);
    setFormState({
      name: shipTo.name,
      code: shipTo.code ?? "",
      countryCode: shipTo.country_code ?? "",
      status: shipTo.status,
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingShipTo ? "Edit Ship-to" : "Add Ship-to"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="ship-to-name">Name</Label>
              <Input
                id="ship-to-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
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
                onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Optional code"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ship-to-country-code">Country Code</Label>
              <Input
                id="ship-to-country-code"
                value={formState.countryCode}
                onChange={(event) => setFormState((prev) => ({ ...prev, countryCode: event.target.value }))}
                placeholder="e.g. KR"
                disabled={isPending}
              />
            </div>

            {editingShipTo ? (
              <div className="grid gap-2">
                <Label htmlFor="ship-to-status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value: "active" | "inactive") => {
                    setFormState((prev) => ({ ...prev, status: value }));
                  }}
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
            ) : null}

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
