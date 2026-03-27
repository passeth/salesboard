"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserWithOrg } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { UserRow } from "@/types/database";
import { ColumnDef } from "@tanstack/react-table";
import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { adminResetPassword } from "./_actions/user-actions";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Buyer]: "Buyer",
  [UserRole.Vendor]: "Vendor",
  [UserRole.Sales]: "Sales",
  [UserRole.Logistics]: "Logistics",
  [UserRole.Admin]: "Admin",
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  [UserRole.Buyer]: "bg-blue-100 text-blue-800",
  [UserRole.Vendor]: "bg-purple-100 text-purple-800",
  [UserRole.Sales]: "bg-amber-100 text-amber-800",
  [UserRole.Logistics]: "bg-cyan-100 text-cyan-800",
  [UserRole.Admin]: "bg-red-100 text-red-800",
};

const STATUS_BADGE_CLASS: Record<UserRow["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-800",
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function ResetPasswordCell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const password = formData.get("password") as string;
        await adminResetPassword(userId, password);
        setSuccess(true);
        setTimeout(() => setOpen(false), 1000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reset password");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setSuccess(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="mr-1 h-3.5 w-3.5" />
          Reset PW
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form action={handleReset} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" minLength={6} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Password reset successfully</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const usersColumns: ColumnDef<UserWithOrg>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge className={cn(ROLE_BADGE_CLASS[row.original.role as UserRole])}>
        {ROLE_LABELS[row.original.role as UserRole]}
      </Badge>
    ),
  },
  {
    id: "organization_name",
    header: "Organization",
    enableSorting: false,
    accessorFn: (row) => row.organization?.name ?? "-",
    cell: ({ row }) => row.original.organization?.name ?? "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={cn("capitalize", STATUS_BADGE_CLASS[row.original.status])}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ResetPasswordCell userId={row.original.id} />,
  },
];
