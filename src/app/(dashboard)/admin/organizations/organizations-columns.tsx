import { Badge } from "@/components/ui/badge";
import { OrganizationWithParent } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import { OrgType } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  internal: "Internal",
  vendor: "Vendor",
  buyer_country: "Buyer Country",
  buyer_company: "Buyer Company",
  buyer_ship_to: "Buyer Ship To",
};

const ORG_TYPE_BADGE_CLASS: Record<OrgType, string> = {
  internal: "bg-purple-100 text-purple-800",
  vendor: "bg-blue-100 text-blue-800",
  buyer_country: "bg-green-100 text-green-800",
  buyer_company: "bg-amber-100 text-amber-800",
  buyer_ship_to: "bg-gray-100 text-gray-800",
};

const ORG_TYPE_LEVEL: Record<OrgType, number> = {
  internal: 0,
  vendor: 0,
  buyer_country: 1,
  buyer_company: 2,
  buyer_ship_to: 3,
};

const STATUS_BADGE_CLASS: Record<OrganizationWithParent["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-red-100 text-red-800",
};

export const organizationsColumns: ColumnDef<OrganizationWithParent>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => row.original.code ?? "-",
  },
  {
    accessorKey: "org_type",
    header: "Type",
    cell: ({ row }) => {
      const orgType = row.original.org_type as OrgType;
      const level = ORG_TYPE_LEVEL[orgType] ?? 0;

      return (
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 0.5}rem` }}>
          <span className="text-xs text-muted-foreground">L{level}</span>
          <Badge className={cn(ORG_TYPE_BADGE_CLASS[orgType])}>{ORG_TYPE_LABELS[orgType]}</Badge>
        </div>
      );
    },
  },
  {
    id: "parent_name",
    header: "Parent Org",
    enableSorting: false,
    accessorFn: (row) => row.parent?.name ?? "-",
    cell: ({ row }) => row.original.parent?.name ?? "-",
  },
  {
    accessorKey: "country_code",
    header: "Country Code",
    cell: ({ row }) => row.original.country_code ?? "-",
  },
  {
    accessorKey: "currency_code",
    header: "Currency Code",
    cell: ({ row }) => row.original.currency_code ?? "-",
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
];
