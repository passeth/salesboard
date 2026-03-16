"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizationRow } from "@/types";
import { Building2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type BuyerOrgSelectorProps = {
  organizations: Pick<OrganizationRow, "id" | "name" | "code" | "org_type">[];
  currentOrgId?: string;
};

export function BuyerOrgSelector({
  organizations,
  currentOrgId,
}: BuyerOrgSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (orgId: string) => {
    if (orgId === "all") {
      router.push(pathname);
    } else {
      router.push(`${pathname}?org=${orgId}`);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <Building2 className="size-5 text-muted-foreground" />
      <div className="flex flex-1 items-center gap-3">
        <p className="text-sm font-medium whitespace-nowrap">Viewing as Buyer:</p>
        <Select value={currentOrgId ?? "all"} onValueChange={handleChange}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="All Buyers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buyers</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name} {org.code ? `(${org.code})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
