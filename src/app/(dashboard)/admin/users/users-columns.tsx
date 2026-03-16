import { Badge } from "@/components/ui/badge";
import { UserWithOrg } from "@/lib/queries/admin";
import { UserRole } from "@/types";
import { UserRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

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
];
