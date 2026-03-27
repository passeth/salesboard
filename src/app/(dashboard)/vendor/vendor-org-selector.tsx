"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VendorOrganization } from "@/lib/queries/vendor";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type VendorOrgSelectorProps = {
  vendors: VendorOrganization[];
  currentVendorOrg?: string;
};

export function VendorOrgSelector({
  vendors,
  currentVendorOrg,
}: VendorOrgSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "none") {
        params.delete("vendorOrg");
      } else {
        params.set("vendorOrg", value);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium whitespace-nowrap">Viewing as Vendor:</p>
      <Select value={currentVendorOrg ?? "none"} onValueChange={handleChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select a vendor...</SelectItem>
          {vendors.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.code ? `${v.name} (${v.code})` : v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
